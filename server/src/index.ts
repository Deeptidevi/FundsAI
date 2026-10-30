// Main Backend Server Application for G-MAPS Industrial Intelligence
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMigrations } from './db/client.js';
import { jobWorker } from './jobs/jobWorker.js';

import { leadsRouter } from './routes/leads.js';
import { campaignsRouter } from './routes/campaigns.js';
import { inboxRouter } from './routes/inbox.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { testLabRouter } from './routes/testLab.js';
import { webhooksRouter } from './routes/webhooks.js';
import { analyticsRouter } from './routes/analytics.js';
import { exportRouter, placesRouter } from './routes/exportAndPlaces.js';
import { actionRoutes } from './routes/actions.js';
import { imapListener } from './integrations/imapListener.js';
import { followupScheduler } from './services/followupScheduler.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
[
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
].forEach((envPath) => dotenv.config({ path: envPath }));

// Execute database migrations
try {
  runMigrations();
  console.log('Database schema migrations applied successfully.');
} catch (err) {
  console.error('Database migration error:', err);
}

// Start durable background job queue
jobWorker.start(5000);
console.log('Durable background job processor worker started.');

// Start real IMAP email listener for incoming reply detection
imapListener.start();

// Start autonomous persistent follow-up scheduler
followupScheduler.start();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check root
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'gmaps-industrial-platform-api',
  });
});

// Mount Routes
app.route('/api/leads', leadsRouter);
app.route('/api/campaigns', campaignsRouter);
app.route('/api/inbox', inboxRouter);
app.route('/api/knowledge', knowledgeRouter);
app.route('/api/test-lab', testLabRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/export', exportRouter);
app.route('/api/places', placesRouter);
app.route('/api/actions', actionRoutes);

import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';

// Serve built React client SPA from client/dist if present
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use('/assets/*', serveStatic({ root: path.relative(process.cwd(), clientDist) }));
  app.get('*', (c) => {
    // Skip if path starts with /api
    if (c.req.path.startsWith('/api')) {
      return c.json({ error: 'API route not found' }, 404);
    }
    const htmlPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(htmlPath)) {
      return c.html(fs.readFileSync(htmlPath, 'utf-8'));
    }
    return c.text('G-MAPS Industrial Intelligence API is running. Build frontend with: npm --prefix client run build', 200);
  });
} else {
  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>G-MAPS Industrial Intelligence API</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem;">
          <h2>G-MAPS Industrial Intelligence API is Active</h2>
          <p>The backend REST API is running successfully on port ${process.env.PORT || 3001}.</p>
          <p>To launch the interactive web dashboard:</p>
          <code>npm --prefix client run dev</code>
          <p>And visit <a href="http://localhost:5173" style="color: #38bdf8;">http://localhost:5173</a>.</p>
        </body>
      </html>
    `);
  });
}

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`G-MAPS Industrial Intelligence server listening on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
