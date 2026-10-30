// Analytics & Real Database-Derived Metrics Router (Zero Dummy Data Policy)
import { Hono } from 'hono';
import { db, dbQueries } from '../db/schema.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
import { whatsappAdapter } from '../integrations/whatsappAdapter.js';
import { geminiAdapter } from '../ai/geminiAdapter.js';
import { placesService } from '../services/placesService.js';
export const analyticsRouter = new Hono();
/**
 * Returns strictly real metrics derived from persisted SQLite / D1 database rows
 */
analyticsRouter.get('/dashboard', (c) => {
    const metrics = dbQueries.getDashboardMetrics();
    // Tier distribution from real leads
    const tierDistribution = db.prepare(`
    SELECT tier, COUNT(*) as count 
    FROM leads 
    GROUP BY tier
  `).all();
    // City distribution from real leads
    const cityDistribution = db.prepare(`
    SELECT COALESCE(city, 'Unknown') as city, COUNT(*) as count 
    FROM leads 
    GROUP BY city 
    ORDER BY count DESC 
    LIMIT 10
  `).all();
    // Lead status breakdown
    const statusDistribution = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM leads 
    GROUP BY status
  `).all();
    return c.json({
        metrics,
        tierDistribution,
        cityDistribution,
        statusDistribution,
    });
});
/**
 * Health check for integrations (Email, Meta WhatsApp, Google Places, Gemini AI)
 */
analyticsRouter.get('/integrations-health', async (c) => {
    const emailHealth = await emailAdapter.checkHealth();
    const waHealth = await whatsappAdapter.checkHealth();
    const aiHealth = geminiAdapter.checkHealth();
    // Real live health check against Google Places API (New)
    const placesStatus = await placesService.getApiStatus();
    const placesHealth = {
        status: placesStatus.status === 'CONNECTED' ? 'healthy' : placesStatus.status === 'QUOTA_EXCEEDED' ? 'warning' : 'error',
        message: `${placesStatus.message} (Key: ${placesStatus.maskedKey}, Latency: ${placesStatus.responseTimeMs || 0}ms)`,
    };
    return c.json({
        email: emailHealth,
        whatsapp: waHealth,
        ai: aiHealth,
        places: placesHealth,
    });
});
