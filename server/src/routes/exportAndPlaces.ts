// Export and Places API Routers
import { Hono } from 'hono';
import { exportService } from '../services/exportService.js';
import { placesService } from '../services/placesService.js';
import { excelExportService } from '../services/excelExportService.js';
import { webhookTransferService } from '../services/webhookTransferService.js';
import { db } from '../db/schema.js';

export const exportRouter = new Hono();

// Legacy CSV Export
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

/**
 * Handler: Download Complete Excel Workbook (.xlsx) for selected companies
 */
const handleExcelDownload = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let companyIds: string[] = body.companyIds || body.leadIds || [];

    // If no specific IDs passed, resolve IDs from active filters
    if (companyIds.length === 0) {
      let sql = 'SELECT id FROM leads WHERE 1=1';
      const params: string[] = [];
      if (body.status) {
        sql += ' AND status = ?';
        params.push(body.status);
      }
      if (body.city) {
        sql += ' AND city = ?';
        params.push(body.city);
      }
      if (body.tier) {
        sql += ' AND tier = ?';
        params.push(body.tier);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = db.prepare(sql).all(...params) as Array<{ id: string }>;
      companyIds = rows.map((r) => r.id);
    }

    if (companyIds.length === 0) {
      return c.json({ error: 'No company records found matching the selection to export.' }, 400);
    }

    const records = excelExportService.getCompanyRecordsByIds(companyIds);
    const exportId = `EXP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    const workbookInfo = excelExportService.generateWorkbookBuffer(records, {
      exportId,
      totalSelectedCount: companyIds.length,
      datasetName: body.datasetName || 'FundsAI Companies Directory Export',
    });

    return new Response(new Uint8Array(workbookInfo.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${workbookInfo.filename}"`,
        'X-Export-Id': exportId,
        'X-Total-Records': String(records.length),
        'X-Checksum-SHA256': workbookInfo.checksumSha256,
      },
    });
  } catch (err: unknown) {
    return c.json({ error: `Excel generation failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
};

exportRouter.post('/workbook', handleExcelDownload);
exportRouter.post('/excel', handleExcelDownload);

/**
 * Direct Excel Export of all Discovered Industrial Companies from search results
 * Generates comprehensive .xlsx with Sequence Numbers, Haversine Distance,
 * Radius Belts (1, 2, 3, 5, 25 km), Contact Info, and Summary.
 */
exportRouter.post('/places-excel', async (c) => {
  try {
    const body = await c.req.json();
    const places = Array.isArray(body.places) ? body.places : [];
    const anchorName = body.anchorName || 'Industrial Search Area';
    const radiusKm = body.radiusKm || 25;
    const searchQuery = body.searchQuery || 'Industrial MSMEs';
    const datasetName = body.datasetName || `FundsAI Industrial Discovery - ${anchorName} (${radiusKm} km)`;

    if (places.length === 0) {
      return c.json({ error: 'No places provided for export.' }, 400);
    }

    // Convert places to complete CompanyExportData with 1-based sequence numbering
    const records = excelExportService.convertPlacesToExportData(places, anchorName, radiusKm, searchQuery);
    const exportId = `EXP-IND-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    const workbookInfo = excelExportService.generateWorkbookBuffer(records, {
      exportId,
      totalSelectedCount: records.length,
      datasetName,
    });

    return new Response(new Uint8Array(workbookInfo.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${workbookInfo.filename}"`,
        'X-Export-Id': exportId,
        'X-Total-Records': String(records.length),
        'X-Checksum-SHA256': workbookInfo.checksumSha256,
      },
    });
  } catch (err: unknown) {
    return c.json({ error: `Direct Places Excel generation failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});

/**
 * Handler: Initiates sequential 100-batch webhook transfer to external AI Agent Dashboard
 */
const handleWebhookDispatch = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let companyIds: string[] = body.companyIds || body.leadIds || [];

    if (companyIds.length === 0) {
      let sql = 'SELECT id FROM leads WHERE 1=1';
      const params: string[] = [];
      if (body.status) {
        sql += ' AND status = ?';
        params.push(body.status);
      }
      if (body.city) {
        sql += ' AND city = ?';
        params.push(body.city);
      }
      if (body.tier) {
        sql += ' AND tier = ?';
        params.push(body.tier);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = db.prepare(sql).all(...params) as Array<{ id: string }>;
      companyIds = rows.map((r) => r.id);
    }

    if (companyIds.length === 0) {
      return c.json({ error: 'No companies selected for transfer to AI Agent Dashboard.' }, 400);
    }

    const { job, batches } = webhookTransferService.createExportJob(
      companyIds,
      'ai_dashboard_webhook',
      body.customWebhookUrl
    );

    // Launch transfer asynchronously in background so client receives fast response
    webhookTransferService.executeJobTransfer(job.id).catch((err) => {
      console.error(`[Webhook Background Worker] Job ${job.id} encountered error:`, err);
    });

    return c.json({
      success: true,
      exportId: job.id,
      totalRecords: job.totalRecords,
      totalBatches: job.totalBatches,
      batchSize: job.batchSize,
      targetWebhookUrl: job.targetWebhookUrl,
      job,
      batches,
    });
  } catch (err: unknown) {
    return c.json({ error: `Transfer initialization failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
  }
};

exportRouter.post('/webhook/dispatch', handleWebhookDispatch);
exportRouter.post('/webhook/start', handleWebhookDispatch);

/**
 * Handler: Get real-time status of an ongoing or completed export job
 */
const handleGetStatus = (c: any) => {
  const exportId = c.req.param('id') || c.req.param('exportId');
  const job = webhookTransferService.getJobById(exportId);
  if (!job) {
    return c.json({ error: `Export job ${exportId} not found.` }, 404);
  }
  return c.json({ job });
};

exportRouter.get('/status/:id', handleGetStatus);
exportRouter.get('/status/:exportId', handleGetStatus);
exportRouter.get('/webhook/status/:id', handleGetStatus);

/**
 * Handler: Retry failed batches for an export job
 */
const handleRetry = async (c: any) => {
  const exportId = c.req.param('id') || c.req.param('exportId');
  try {
    const job = await webhookTransferService.retryFailedBatches(exportId);
    return c.json({ success: true, job });
  } catch (err: unknown) {
    return c.json({ error: `Retry failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
  }
};

exportRouter.post('/retry/:id', handleRetry);
exportRouter.post('/retry/:exportId', handleRetry);
exportRouter.post('/webhook/retry/:id', handleRetry);

/**
 * Handler: Cancel pending batches for an export job
 */
const handleCancel = (c: any) => {
  const exportId = c.req.param('id') || c.req.param('exportId');
  try {
    const job = webhookTransferService.cancelJob(exportId);
    return c.json({ success: true, job });
  } catch (err: unknown) {
    return c.json({ error: `Cancellation failed: ${err instanceof Error ? err.message : String(err)}` }, 400);
  }
};

exportRouter.post('/cancel/:id', handleCancel);
exportRouter.post('/cancel/:exportId', handleCancel);
exportRouter.post('/webhook/cancel/:id', handleCancel);

/**
 * Public Webhook Configuration (never exposes secrets or raw credentials)
 */
exportRouter.get('/config', (c) => {
  const config = webhookTransferService.getConfig();
  return c.json({
    isConfigured: config.isConfigured,
    configured: config.isConfigured,
    batchSize: config.batchSize,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    hasSecretConfigured: Boolean(config.signingSecret),
    hasBearerTokenConfigured: Boolean(config.bearerToken),
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
    return c.json({ error: `Places search failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});
