// Leads Management API Router
import { Hono } from 'hono';
import { db, dbQueries } from '../db/schema.js';
import { importService, ColumnMapping } from '../services/importService.js';

export const leadsRouter = new Hono();

// List leads
leadsRouter.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const status = c.req.query('status');
  const city = c.req.query('city');
  const tier = c.req.query('tier');

  const leads = dbQueries.getLeads(limit, offset, status, city, tier);
  const total = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;

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
      const existing = db.prepare('SELECT id FROM leads WHERE place_id = ?').get(placeId) as { id: string } | undefined;
      if (existing) {
        return c.json({ success: true, leadId: existing.id, isExisting: true, message: 'Lead already saved in CRM.' });
      }
    }

    const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const coords = body.customFields?.coordinates || body.coordinates;

    const validPriorities = ['high', 'medium', 'low'];
    let priority = (body.priority || 'medium').toLowerCase();
    if (priority === 'normal') priority = 'medium';
    if (!validPriorities.includes(priority)) priority = 'medium';

    const validStatuses = ['new', 'contacted', 'engaged', 'qualified', 'meeting_scheduled', 'won', 'lost', 'suppressed'];
    let status = (body.status || 'new').toLowerCase();
    if (status === 'prospect') status = 'new';
    if (!validStatuses.includes(status)) status = 'new';

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
  } catch (err: unknown) {
    return c.json({ error: `Failed to save lead: ${err instanceof Error ? err.message : String(err)}` }, 500);
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
  } catch (err: unknown) {
    return c.json({ error: `File parsing failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
  }
});

// Execute import with column mapping
leadsRouter.post('/import/execute', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const mappingStr = body['mapping'] as string;

  if (!file || typeof file === 'string' || !(file instanceof File) || !mappingStr) {
    return c.json({ error: 'Spreadsheet file and column mapping are required.' }, 400);
  }

  let mapping: ColumnMapping;
  try {
    mapping = JSON.parse(mappingStr);
  } catch {
    return c.json({ error: 'Invalid column mapping JSON format.' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const summary = importService.executeImport(buffer, file.name, mapping);
    return c.json({ summary });
  } catch (err: unknown) {
    return c.json({ error: `Import execution failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});
