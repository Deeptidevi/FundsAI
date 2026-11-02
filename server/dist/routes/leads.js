// Leads Management API Router
import { Hono } from 'hono';
import { db, dbQueries } from '../db/schema.js';
import { importService } from '../services/importService.js';
export const leadsRouter = new Hono();
// List leads
leadsRouter.get('/', (c) => {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const status = c.req.query('status');
    const city = c.req.query('city');
    const tier = c.req.query('tier');
    const leads = dbQueries.getLeads(limit, offset, status, city, tier);
    const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    return c.json({
        leads,
        total,
        limit,
        offset,
    });
});
// Create single lead (from Industrial Discovery search or manual entry)
leadsRouter.post('/', async (c) => {
    try {
        const body = await c.req.json();
        if (!body.companyName) {
            return c.json({ error: 'companyName is required' }, 400);
        }
        // Deduplication check by placeId
        const placeId = body.placeId || body.customFields?.placeId;
        if (placeId) {
            const existing = db.prepare('SELECT id FROM leads WHERE place_id = ?').get(placeId);
            if (existing) {
                return c.json({ success: true, leadId: existing.id, isExisting: true, message: 'Lead already saved in CRM.' });
            }
        }
        const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const coords = body.customFields?.coordinates || body.coordinates;
        const validPriorities = ['high', 'medium', 'low'];
        let priority = (body.priority || 'medium').toLowerCase();
        if (priority === 'normal')
            priority = 'medium';
        if (!validPriorities.includes(priority))
            priority = 'medium';
        const validStatuses = ['new', 'contacted', 'engaged', 'qualified', 'meeting_scheduled', 'won', 'lost', 'suppressed'];
        let status = (body.status || 'new').toLowerCase();
        if (status === 'prospect')
            status = 'new';
        if (!validStatuses.includes(status))
            status = 'new';
        const validTiers = ['Gold', 'Silver', 'Bronze', 'Unranked'];
        const tier = validTiers.includes(body.tier) ? body.tier : 'Bronze';
        dbQueries.insertLead({
            id: leadId,
            placeId: placeId || null,
            companyName: body.companyName,
            primaryType: body.primaryType || body.category || 'Industrial Enterprise',
            tier,
            rating: typeof body.rating === 'number' ? body.rating : 0.0,
            reviewCount: typeof body.reviewCount === 'number' ? body.reviewCount : 0,
            address: body.address || null,
            city: body.city || 'Pune',
            state: body.state || 'Maharashtra',
            country: body.country || 'India',
            postalCode: body.postalCode || null,
            latitude: coords?.latitude || body.latitude || null,
            longitude: coords?.longitude || body.longitude || null,
            website: body.website || null,
            googleMapsUrl: body.googleMapsUrl || body.googleMapsUri || (placeId ? `https://maps.google.com/?q=place_id:${placeId}` : null),
            source: body.source || 'Google Places Discovery',
            status,
            priority,
            notes: body.notes || null,
            customFields: body.customFields || null,
        });
        if (body.phone) {
            const contactId = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            dbQueries.insertContact({
                id: contactId,
                leadId,
                contactName: body.contactName || body.companyName,
                designation: 'Main Plant / General Office',
                email: body.email || null,
                phoneRaw: body.phone,
                phoneE164: body.phone.startsWith('+') ? body.phone : `+91${body.phone.replace(/\D/g, '')}`,
                phoneType: body.customFields?.phoneType || body.phoneType || 'Unknown',
                isPrimary: true,
                isVerified: false,
            });
        }
        return c.json({ success: true, leadId, isExisting: false });
    }
    catch (err) {
        return c.json({ error: `Failed to save lead: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
// Batch save multiple discovered places to CRM atomically in a single fast transaction
leadsRouter.post('/batch', async (c) => {
    try {
        const body = await c.req.json();
        const places = Array.isArray(body.places) ? body.places : [];
        const searchAnchor = body.searchAnchor || '';
        const searchRadiusKm = body.searchRadiusKm || 5;
        const searchQuery = body.searchQuery || 'Industrial Discovery';
        if (places.length === 0) {
            return c.json({ error: 'No places provided in batch' }, 400);
        }
        const leadIds = [];
        let newlyCreated = 0;
        let existingCount = 0;
        const insertLeadStmt = db.prepare(`
      INSERT INTO leads (
        id, place_id, company_name, primary_type, tier, rating, review_count,
        address, city, state, country, postal_code, latitude, longitude,
        website, google_maps_url, source, status, priority, notes, custom_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertContactStmt = db.prepare(`
      INSERT INTO lead_contacts (
        id, lead_id, contact_name, designation, email, phone_raw, phone_e164, phone_type, is_primary, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
    `);
        const findExistingStmt = db.prepare('SELECT id FROM leads WHERE place_id = ?');
        const batchTransaction = db.transaction(() => {
            for (const p of places) {
                if (!p.name)
                    continue;
                const placeId = p.placeId || null;
                if (placeId) {
                    const existing = findExistingStmt.get(placeId);
                    if (existing) {
                        leadIds.push(existing.id);
                        existingCount++;
                        continue;
                    }
                }
                const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                leadIds.push(leadId);
                newlyCreated++;
                // Extract city, state, and postal code from address and anchor
                const addr = p.address || '';
                let postalCode = null;
                const pinMatch = addr.match(/\b([1-9][0-9]{5})\b/);
                if (pinMatch) {
                    postalCode = pinMatch[1];
                }
                // Parse City and State dynamically
                let city = 'Industrial Hub';
                let state = 'India';
                if (addr) {
                    const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        const lastPart = parts[parts.length - 1];
                        const secondLast = parts[parts.length - 2];
                        if (lastPart.toLowerCase().includes('india') && parts.length >= 3) {
                            state = parts[parts.length - 2].replace(/\d+/g, '').trim();
                            city = parts[parts.length - 3].trim();
                        }
                        else {
                            state = lastPart.replace(/\d+/g, '').trim();
                            city = secondLast.trim();
                        }
                    }
                    else if (parts.length === 1) {
                        city = parts[0];
                    }
                }
                if ((city === 'Industrial Hub' || !city) && searchAnchor) {
                    const anchorParts = searchAnchor.split(',').map((s) => s.trim());
                    city = anchorParts[0] || 'Industrial Zone';
                    if (anchorParts.length > 1) {
                        state = anchorParts[1] || state;
                    }
                }
                const tier = ['Gold', 'Silver', 'Bronze'].includes(p.tier) ? p.tier : 'Bronze';
                const priority = tier === 'Gold' ? 'high' : tier === 'Silver' ? 'medium' : 'low';
                insertLeadStmt.run(leadId, placeId, p.name, p.primaryType || 'Industrial Enterprise', tier, typeof p.rating === 'number' ? p.rating : 0.0, typeof p.reviewCount === 'number' ? p.reviewCount : 0, p.address || null, city, state, 'India', postalCode, p.location?.latitude || null, p.location?.longitude || null, p.website || null, p.googleMapsUri || (placeId ? `https://maps.google.com/?q=place_id:${placeId}` : null), 'Google Places Discovery', 'new', priority, `Discovered in ${searchAnchor || 'Industrial Area'} within ${p.distanceKm || searchRadiusKm} km`, JSON.stringify({
                    placeId,
                    distanceKm: p.distanceKm || '0.0',
                    distanceMeters: p.distanceMeters || 0,
                    searchAnchor,
                    searchRadiusKm,
                    searchQuery,
                    phoneType: p.phoneType,
                    coordinates: p.location,
                }));
                if (p.phone) {
                    const contactId = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    insertContactStmt.run(contactId, leadId, p.name, 'Main Office / Plant Operations', null, p.phone, p.phone.startsWith('+') ? p.phone : `+91${p.phone.replace(/\D/g, '')}`, p.phoneType || 'Business Phone');
                }
            }
        });
        batchTransaction();
        return c.json({
            success: true,
            totalReceived: places.length,
            newlyCreated,
            existingCount,
            leadIds,
            message: `Successfully processed ${places.length} companies (${newlyCreated} newly saved, ${existingCount} already present).`,
        });
    }
    catch (err) {
        return c.json({ error: `Batch save failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
// Lead detail
leadsRouter.get('/:id', (c) => {
    const id = c.req.param('id');
    const lead = dbQueries.getLeadById(id);
    if (!lead) {
        return c.json({ error: 'Lead not found' }, 404);
    }
    return c.json({ lead });
});
// Update lead status / notes
leadsRouter.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    if (body.status) {
        db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.status, id);
    }
    if (body.priority) {
        db.prepare('UPDATE leads SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.priority, id);
    }
    if (body.notes !== undefined) {
        db.prepare('UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.notes, id);
    }
    const updated = dbQueries.getLeadById(id);
    return c.json({ lead: updated });
});
// Parse preview of uploaded spreadsheet file
leadsRouter.post('/import/preview', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || typeof file === 'string' || !(file instanceof File)) {
        return c.json({ error: 'Valid spreadsheet file (xlsx or csv) is required.' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    try {
        const preview = importService.parseFilePreview(buffer, file.name);
        return c.json(preview);
    }
    catch (err) {
        return c.json({ error: `File parsing failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
    }
});
// Execute import with column mapping
leadsRouter.post('/import/execute', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    const mappingStr = body['mapping'];
    if (!file || typeof file === 'string' || !(file instanceof File) || !mappingStr) {
        return c.json({ error: 'Spreadsheet file and column mapping are required.' }, 400);
    }
    let mapping;
    try {
        mapping = JSON.parse(mappingStr);
    }
    catch {
        return c.json({ error: 'Invalid column mapping JSON format.' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    try {
        const summary = importService.executeImport(buffer, file.name, mapping);
        return c.json({ summary });
    }
    catch (err) {
        return c.json({ error: `Import execution failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
