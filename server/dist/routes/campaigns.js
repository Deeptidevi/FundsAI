// Campaign Orchestration API Router
import { Hono } from 'hono';
import { dbQueries } from '../db/schema.js';
import { campaignService } from '../services/campaignService.js';
export const campaignsRouter = new Hono();
// List campaigns
campaignsRouter.get('/', (c) => {
    const campaigns = dbQueries.getCampaigns();
    return c.json({ campaigns });
});
// Campaign detail
campaignsRouter.get('/:id', (c) => {
    const id = c.req.param('id');
    const campaign = dbQueries.getCampaignById(id);
    if (!campaign) {
        return c.json({ error: 'Campaign not found' }, 404);
    }
    return c.json({ campaign });
});
// Create draft campaign
campaignsRouter.post('/', async (c) => {
    const body = await c.req.json();
    if (!body.name || !body.channels || !Array.isArray(body.channels) || !body.leadIds || !Array.isArray(body.leadIds)) {
        return c.json({ error: 'Campaign name, channels array, and leadIds array are required.' }, 400);
    }
    try {
        const result = campaignService.createDraftCampaign(body);
        return c.json(result, 201);
    }
    catch (err) {
        return c.json({ error: `Campaign creation failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
// Generate message preview and validation report
campaignsRouter.get('/:id/preview', (c) => {
    const id = c.req.param('id');
    try {
        const preview = campaignService.generatePreview(id);
        return c.json(preview);
    }
    catch (err) {
        return c.json({ error: `Preview failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
    }
});
/**
 * EXPLICIT HUMAN APPROVAL GATE
 * Production outreach can only begin after an authorized human calls this endpoint.
 */
campaignsRouter.post('/:id/approve', async (c) => {
    const id = c.req.param('id');
    try {
        const res = campaignService.approveAndEnqueueCampaign(id);
        return c.json({
            success: true,
            message: `Campaign approved by human operator. ${res.enqueuedJobs} durable message jobs enqueued.`,
            enqueuedJobs: res.enqueuedJobs,
        });
    }
    catch (err) {
        return c.json({ error: `Approval failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
// Pause campaign
campaignsRouter.post('/:id/pause', (c) => {
    const id = c.req.param('id');
    campaignService.pauseCampaign(id);
    return c.json({ success: true, status: 'paused' });
});
// Resume campaign
campaignsRouter.post('/:id/resume', (c) => {
    const id = c.req.param('id');
    campaignService.resumeCampaign(id);
    return c.json({ success: true, status: 'running' });
});
// Cancel campaign
campaignsRouter.post('/:id/cancel', (c) => {
    const id = c.req.param('id');
    campaignService.cancelCampaign(id);
    return c.json({ success: true, status: 'cancelled' });
});
