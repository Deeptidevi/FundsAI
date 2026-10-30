// Export and Places API Routers
import { Hono } from 'hono';
import { exportService } from '../services/exportService.js';
import { placesService } from '../services/placesService.js';
export const exportRouter = new Hono();
exportRouter.get('/leads.csv', (c) => {
    const status = c.req.query('status');
    const csv = exportService.exportLeadsToCsv(status);
    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="gmaps_leads_export.csv"',
        },
    });
});
export const placesRouter = new Hono();
/**
 * Location resolution / geocoding endpoint.
 * Resolves any company name, locality, industrial area, MIDC, or city into coordinates.
 */
placesRouter.post('/resolve', async (c) => {
    try {
        const body = await c.req.json();
        const query = (body.query || '').trim();
        if (!query) {
            return c.json({ found: false, message: 'Search query is required' }, 400);
        }
        const result = await placesService.resolveLocation(query);
        return c.json(result);
    }
    catch (err) {
        return c.json({ found: false, message: `Resolution error: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
/**
 * Health and quota diagnostic check for Google Places API key.
 */
placesRouter.get('/status', async (c) => {
    try {
        const status = await placesService.getApiStatus();
        return c.json(status);
    }
    catch (err) {
        return c.json({ configured: false, status: 'ERROR', message: String(err) }, 500);
    }
});
/**
 * Industrial discovery search endpoint.
 */
placesRouter.post('/search', async (c) => {
    const body = await c.req.json();
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
        return c.json({ error: 'latitude and longitude are required.' }, 400);
    }
    try {
        const result = await placesService.searchIndustrialPlaces({
            query: body.query || 'all',
            latitude: body.latitude,
            longitude: body.longitude,
            radiusKm: body.radiusKm || 5,
            directionBias: body.directionBias || 'ALL',
            pageSize: body.pageSize || 20,
            category: body.category,
            anchorName: body.anchorName,
        });
        return c.json(result);
    }
    catch (err) {
        return c.json({ error: `Places search failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
