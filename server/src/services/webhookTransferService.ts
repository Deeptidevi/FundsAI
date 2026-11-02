import crypto from 'node:crypto';
import { db } from '../db/schema.js';
import { excelExportService, CompanyExportData } from './excelExportService.js';
import { ExportJob, ExportBatch, WebhookBatchMetadata } from '@gmaps/shared';

export interface WebhookConfig {
  webhookUrl: string;
  signingSecret?: string;
  bearerToken?: string;
  timeoutMs: number;
  batchSize: number;
  maxRetries: number;
  isConfigured: boolean;
}

export class WebhookHttpError extends Error {
  public statusCode: number;
  public isRetryable: boolean;
  public responseBody?: string;

  constructor(message: string, statusCode: number, isRetryable: boolean, responseBody?: string) {
    super(message);
    this.name = 'WebhookHttpError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.responseBody = responseBody;
  }
}

export class WebhookTransferService {
  constructor() {
    this.reconcileStaleJobsOnStartup();
  }

  /**
   * Resets any hanging in-progress or retrying jobs/batches back to pending upon startup
   */
  public reconcileStaleJobsOnStartup(): void {
    try {
      const resBatches = db.prepare(`
        UPDATE export_batches
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE status IN ('in_progress', 'retrying')
      `).run();

      const resJobs = db.prepare(`
        UPDATE export_jobs
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'in_progress'
      `).run();

      if (resBatches.changes > 0 || resJobs.changes > 0) {
        console.log(`[Webhook Transfer Service] Reconciled ${resJobs.changes} stale jobs and ${resBatches.changes} stale batches on startup.`);
      }
    } catch (err) {
      console.error('[Webhook Transfer Service] Startup reconciliation notice:', err);
    }
  }

  /**
   * Reads dynamic webhook configuration with safe defaults
   */
  public getConfig(): WebhookConfig {
    const webhookUrl = (process.env.AI_DASHBOARD_WEBHOOK_URL || '').trim();
    const signingSecret = (process.env.AI_DASHBOARD_SIGNING_SECRET || process.env.AI_DASHBOARD_WEBHOOK_SECRET || '').trim() || undefined;
    const bearerToken = (process.env.AI_DASHBOARD_BEARER_TOKEN || '').trim() || undefined;
    const timeoutMs = parseInt(process.env.AI_DASHBOARD_TIMEOUT_MS || process.env.AI_DASHBOARD_TIMEOUT || '30000', 10);
    const batchSize = parseInt(process.env.EXPORT_BATCH_SIZE || process.env.AI_DASHBOARD_BATCH_SIZE || '100', 10);
    const maxRetries = parseInt(process.env.AI_DASHBOARD_MAX_RETRIES || '3', 10);

    return {
      webhookUrl,
      signingSecret,
      bearerToken,
      timeoutMs: isNaN(timeoutMs) || timeoutMs <= 0 ? 30000 : timeoutMs,
      batchSize: isNaN(batchSize) || batchSize <= 0 ? 100 : batchSize,
      maxRetries: isNaN(maxRetries) || maxRetries < 0 ? 3 : maxRetries,
      isConfigured: Boolean(webhookUrl),
    };
  }

  /**
   * Validates target URL against SSRF and ensures HTTPS in production
   */
  public validateWebhookUrl(urlStr: string): string {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      throw new Error(`Invalid webhook destination URL: "${urlStr}" is not a valid URL.`);
    }

    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    if (!isLocal && parsed.protocol !== 'https:') {
      throw new Error(`Insecure webhook URL: Webhook destination must use HTTPS protocol in production.`);
    }

    return parsed.toString();
  }

  /**
   * Initializes a new Export Job and decomposes selected companies into 100-company batches
   */
  public createExportJob(
    selectedCompanyIds: string[],
    exportType: 'excel_download' | 'ai_dashboard_webhook' = 'ai_dashboard_webhook',
    customWebhookUrl?: string
  ): {
    job: ExportJob;
    batches: ExportBatch[];
    records: CompanyExportData[];
  } {
    if (!selectedCompanyIds || selectedCompanyIds.length === 0) {
      throw new Error('At least one company must be selected for export.');
    }

    const config = this.getConfig();

    if (exportType === 'ai_dashboard_webhook') {
      const targetUrl = customWebhookUrl || config.webhookUrl;
      if (!targetUrl) {
        throw new Error(
          'External AI Agent Dashboard webhook URL is not configured. Webhook dispatch is disabled until AI_DASHBOARD_WEBHOOK_URL is set in environment configuration.'
        );
      }
      this.validateWebhookUrl(targetUrl);
    }

    // Deduplicate incoming IDs while preserving user selection order
    const uniqueIds = Array.from(new Set(selectedCompanyIds));

    // Fetch snapshot of companies from database
    const records = excelExportService.getCompanyRecordsByIds(uniqueIds);
    if (records.length === 0) {
      throw new Error('None of the selected company IDs were found in the database.');
    }

    const batchSize = Math.max(1, config.batchSize);
    const totalRecords = records.length;
    const totalBatches = Math.ceil(totalRecords / batchSize);

    const exportId = `EXP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const targetWebhookUrl = customWebhookUrl ? this.validateWebhookUrl(customWebhookUrl) : config.webhookUrl;

    // 1. Insert Export Job
    db.prepare(`
      INSERT INTO export_jobs (
        id, export_type, status, total_records, batch_size, total_batches,
        successful_batches, failed_batches, delivered_records, target_webhook_url,
        metadata
      ) VALUES (?, ?, 'pending', ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(
      exportId,
      exportType,
      totalRecords,
      batchSize,
      totalBatches,
      targetWebhookUrl || null,
      JSON.stringify({ selectedCount: selectedCompanyIds.length, actualFoundCount: totalRecords })
    );

    // 2. Insert Batch Definitions
    const batches: ExportBatch[] = [];
    const insertBatchStmt = db.prepare(`
      INSERT INTO export_batches (
        id, export_job_id, batch_number, total_batches, record_start_index,
        record_end_index, record_count, company_ids, status, retry_count,
        max_retries, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `);

    for (let b = 0; b < totalBatches; b++) {
      const startIndex = b * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalRecords);
      const batchSlice = records.slice(startIndex, endIndex);
      const batchNumber = b + 1;
      const batchId = `BATCH-${exportId}-${String(batchNumber).padStart(3, '0')}`;
      const idempotencyKey = `IDEMP-${batchId}-${crypto.randomBytes(4).toString('hex')}`;
      const sliceIds = batchSlice.map((r) => r.id);

      insertBatchStmt.run(
        batchId,
        exportId,
        batchNumber,
        totalBatches,
        startIndex + 1,
        endIndex,
        batchSlice.length,
        JSON.stringify(sliceIds),
        config.maxRetries,
        idempotencyKey
      );

      batches.push({
        id: batchId,
        exportJobId: exportId,
        batchNumber,
        totalBatches,
        recordStartIndex: startIndex + 1,
        recordEndIndex: endIndex,
        recordCount: batchSlice.length,
        companyIds: sliceIds,
        status: 'pending',
        retryCount: 0,
        maxRetries: config.maxRetries,
        idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const job = this.getJobById(exportId)!;
    return { job, batches, records };
  }

  /**
   * Retrieves full export job status with all constituent batches
   */
  public getJobById(exportId: string): ExportJob | null {
    const jobRow = db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(exportId) as Record<string, unknown> | undefined;
    if (!jobRow) return null;

    const batchRows = db.prepare('SELECT * FROM export_batches WHERE export_job_id = ? ORDER BY batch_number ASC').all(exportId) as Array<Record<string, unknown>>;

    const batches: ExportBatch[] = batchRows.map((b) => ({
      id: b.id as string,
      exportJobId: b.export_job_id as string,
      batchNumber: b.batch_number as number,
      totalBatches: b.total_batches as number,
      recordStartIndex: b.record_start_index as number,
      recordEndIndex: b.record_end_index as number,
      recordCount: b.record_count as number,
      companyIds: JSON.parse(b.company_ids as string),
      status: b.status as ExportBatch['status'],
      retryCount: b.retry_count as number,
      maxRetries: b.max_retries as number,
      idempotencyKey: b.idempotency_key as string,
      checksumSha256: (b.checksum_sha256 as string) || undefined,
      httpStatus: (b.http_status as number) || undefined,
      errorMessage: (b.error_message as string) || undefined,
      acknowledgementData: b.acknowledgement_data ? JSON.parse(b.acknowledgement_data as string) : undefined,
      sentAt: (b.sent_at as string) || undefined,
      acknowledgedAt: (b.acknowledged_at as string) || undefined,
      createdAt: b.created_at as string,
      updatedAt: b.updated_at as string,
    }));

    return {
      id: jobRow.id as string,
      exportType: jobRow.export_type as ExportJob['exportType'],
      status: jobRow.status as ExportJob['status'],
      totalRecords: jobRow.total_records as number,
      batchSize: jobRow.batch_size as number,
      totalBatches: jobRow.total_batches as number,
      successfulBatches: jobRow.successful_batches as number,
      failedBatches: jobRow.failed_batches as number,
      deliveredRecords: jobRow.delivered_records as number,
      targetWebhookUrl: (jobRow.target_webhook_url as string) || undefined,
      idempotencyKey: (jobRow.idempotency_key as string) || undefined,
      errorMessage: (jobRow.error_message as string) || undefined,
      metadata: jobRow.metadata ? JSON.parse(jobRow.metadata as string) : undefined,
      startedAt: (jobRow.started_at as string) || undefined,
      completedAt: (jobRow.completed_at as string) || undefined,
      createdAt: jobRow.created_at as string,
      updatedAt: jobRow.updated_at as string,
      batches,
    };
  }

  /**
   * Executes batch delivery sequentially with backoff and persistent status updates
   */
  public async executeJobTransfer(exportId: string): Promise<ExportJob> {
    const job = this.getJobById(exportId);
    if (!job) throw new Error(`Export job ${exportId} not found.`);

    const config = this.getConfig();
    const webhookUrl = job.targetWebhookUrl || config.webhookUrl;

    if (!webhookUrl) {
      db.prepare(`
        UPDATE export_jobs
        SET status = 'failed', error_message = 'Webhook destination URL is not configured.', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(exportId);
      return this.getJobById(exportId)!;
    }

    // Set job in_progress
    db.prepare(`
      UPDATE export_jobs
      SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(exportId);

    const batches = job.batches || [];
    let deliveredRecords = job.deliveredRecords;
    let successfulBatches = job.successfulBatches;
    let failedBatches = job.failedBatches;

    for (const batch of batches) {
      // Skip already acknowledged batches (idempotency protection)
      if (batch.status === 'success') {
        continue;
      }

      // Check if job was cancelled
      const currentJobState = db.prepare('SELECT status FROM export_jobs WHERE id = ?').get(exportId) as { status: string };
      if (currentJobState.status === 'cancelled') {
        break;
      }

      const companyIds = batch.companyIds;
      const batchRecords = excelExportService.getCompanyRecordsByIds(companyIds);

      // 1. Generate Batch-specific XLSX Workbook
      const workbookInfo = excelExportService.generateWorkbookBuffer(batchRecords, {
        exportId: job.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        totalBatches: batch.totalBatches,
        totalSelectedCount: job.totalRecords,
        schemaVersion: '1.0.0',
        datasetName: `FundsAI Export - Batch ${batch.batchNumber} of ${batch.totalBatches}`,
      });

      // 2. Execute transfer with exponential backoff for retryable errors
      let attempt = batch.retryCount;
      let delivered = false;
      let lastErrMessage = '';
      let ackData: Record<string, unknown> | null = null;
      let responseHttpStatus = 0;

      while (attempt <= batch.maxRetries && !delivered) {
        attempt++;

        // Update batch status to in_progress or retrying
        const newStatus = attempt === 1 ? 'in_progress' : 'retrying';
        db.prepare(`
          UPDATE export_batches
          SET status = ?, retry_count = ?, checksum_sha256 = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStatus, attempt - 1, workbookInfo.checksumSha256, batch.id);

        try {
          const result = await this.sendBatchWebhook({
            webhookUrl,
            signingSecret: config.signingSecret,
            bearerToken: config.bearerToken,
            timeoutMs: config.timeoutMs,
            exportId: job.id,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            totalBatches: batch.totalBatches,
            totalRecords: job.totalRecords,
            batchRecordStart: batch.recordStartIndex,
            batchRecordEnd: batch.recordEndIndex,
            recordCount: batch.recordCount,
            idempotencyKey: batch.idempotencyKey,
            checksumSha256: workbookInfo.checksumSha256,
            workbookBuffer: workbookInfo.buffer,
            filename: workbookInfo.filename,
          });

          responseHttpStatus = result.httpStatus;
          ackData = result.acknowledgement;
          delivered = true;
          break;
        } catch (err: unknown) {
          lastErrMessage = err instanceof Error ? err.message : String(err);
          const isRetryable = err instanceof WebhookHttpError ? err.isRetryable : true;
          responseHttpStatus = err instanceof WebhookHttpError ? err.statusCode : 500;

          console.warn(`[Webhook Transfer] Batch ${batch.batchNumber} attempt ${attempt} failed: ${lastErrMessage}`);

          // Permanent non-retryable 4xx error: stop retrying immediately
          if (!isRetryable) {
            break;
          }

          if (attempt <= batch.maxRetries) {
            // Exponential backoff delay with jitter (1s, 2s, 4s...)
            const jitter = Math.floor(Math.random() * 500);
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) + jitter;
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          }
        }
      }

      // 3. Record Batch Outcome
      if (delivered) {
        successfulBatches++;
        deliveredRecords += batch.recordCount;

        db.prepare(`
          UPDATE export_batches
          SET status = 'success', http_status = ?, acknowledgement_data = ?, error_message = NULL,
              acknowledged_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(responseHttpStatus, ackData ? JSON.stringify(ackData) : null, batch.id);

        // Update Job counters
        db.prepare(`
          UPDATE export_jobs
          SET successful_batches = ?, delivered_records = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(successfulBatches, deliveredRecords, exportId);
      } else {
        failedBatches++;

        db.prepare(`
          UPDATE export_batches
          SET status = 'failed', http_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(responseHttpStatus || 500, lastErrMessage, batch.id);

        db.prepare(`
          UPDATE export_jobs
          SET failed_batches = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(failedBatches, `Batch ${batch.batchNumber} failed: ${lastErrMessage}`, exportId);
      }
    }

    // 4. Finalize Job Status
    const finalJobState = db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(exportId) as Record<string, unknown>;
    if (finalJobState.status !== 'cancelled') {
      const finalStatus = failedBatches === 0 ? 'completed' : successfulBatches > 0 ? 'completed' : 'failed';
      db.prepare(`
        UPDATE export_jobs
        SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(finalStatus, exportId);
    }

    return this.getJobById(exportId)!;
  }

  /**
   * Dispatches a single batch workbook via multipart/form-data to external dashboard
   */
  private async sendBatchWebhook(params: {
    webhookUrl: string;
    signingSecret?: string;
    bearerToken?: string;
    timeoutMs: number;
    exportId: string;
    batchId: string;
    batchNumber: number;
    totalBatches: number;
    totalRecords: number;
    batchRecordStart: number;
    batchRecordEnd: number;
    recordCount: number;
    idempotencyKey: string;
    checksumSha256: string;
    workbookBuffer: Buffer;
    filename: string;
  }): Promise<{ httpStatus: number; acknowledgement: Record<string, unknown> }> {
    const formData = new FormData();

    // 1. Attach Excel Workbook File
    const blob = new Blob([new Uint8Array(params.workbookBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    formData.append('file', blob, params.filename);
    formData.append('excel_file', blob, params.filename);

    // 2. Attach Standardized Metadata
    const timestamp = new Date().toISOString();
    const metadata: WebhookBatchMetadata = {
      exportId: params.exportId,
      batchId: params.batchId,
      batchNumber: params.batchNumber,
      totalBatches: params.totalBatches,
      batchRecordCount: params.recordCount,
      totalRecordCount: params.totalRecords,
      schemaVersion: '1.0.0',
      fileName: params.filename,
      checksumSha256: params.checksumSha256,
      timestamp,
      senderSystem: 'FundsAI',
      source: 'FundsAI Industrial Intelligence Platform',
      totalRecords: params.totalRecords,
      recordCount: params.recordCount,
      idempotencyKey: params.idempotencyKey,
      batchRecordStart: params.batchRecordStart,
      batchRecordEnd: params.batchRecordEnd,
    };

    formData.append('metadata', JSON.stringify(metadata));
    formData.append('metadata_json', JSON.stringify(metadata));

    // Also append flat fields for maximum receiver interoperability
    formData.append('export_id', params.exportId);
    formData.append('batch_id', params.batchId);
    formData.append('batch_number', String(params.batchNumber));
    formData.append('total_batches', String(params.totalBatches));
    formData.append('total_records', String(params.totalRecords));
    formData.append('batch_record_start', String(params.batchRecordStart));
    formData.append('batch_record_end', String(params.batchRecordEnd));
    formData.append('record_count', String(params.recordCount));
    formData.append('idempotency_key', params.idempotencyKey);
    formData.append('checksum_sha256', params.checksumSha256);
    formData.append('timestamp', timestamp);

    // 3. Request Headers
    const headers: Record<string, string> = {
      'X-Idempotency-Key': params.batchId,
      'X-Export-Id': params.exportId,
      'X-Batch-Id': params.batchId,
      'X-Batch-Number': String(params.batchNumber),
      'X-Total-Batches': String(params.totalBatches),
      'X-File-Checksum-SHA256': params.checksumSha256,
    };

    // Bearer token authentication header if configured
    if (params.bearerToken) {
      headers['Authorization'] = `Bearer ${params.bearerToken}`;
    }

    // HMAC Signature if secret configured:
    // Canonical signing string: ${checksumSha256}:${batchId}:${timestamp}
    if (params.signingSecret) {
      const canonicalString = `${params.checksumSha256}:${params.batchId}:${timestamp}`;
      const hmac = crypto.createHmac('sha256', params.signingSecret).update(canonicalString).digest('hex');
      headers['X-FundsAI-Signature'] = `sha256=${hmac}`;
      headers['X-Signature-SHA256'] = hmac;
      headers['X-Webhook-Secret'] = params.signingSecret;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const response = await fetch(params.webhookUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      const statusCode = response.status;
      const responseText = await response.text();

      let ackObj: Record<string, unknown> = {};
      try {
        ackObj = JSON.parse(responseText);
      } catch {
        ackObj = { rawResponse: responseText.substring(0, 300) };
      }

      // 409 Conflict represents an Idempotency Hit (Batch already acknowledged)
      if (statusCode === 409) {
        return {
          httpStatus: 409,
          acknowledgement: {
            ...ackObj,
            isDuplicate: true,
            status: 'DUPLICATE_ACKNOWLEDGED',
          },
        };
      }

      if (!response.ok) {
        // Distinguish retryable 5xx/network vs non-retryable 4xx
        const isRetryable = statusCode >= 500 || statusCode === 429;
        throw new WebhookHttpError(
          `Receiver returned HTTP ${statusCode}: ${responseText.substring(0, 200)}`,
          statusCode,
          isRetryable,
          responseText
        );
      }

      return {
        httpStatus: statusCode,
        acknowledgement: ackObj,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new WebhookHttpError(`Webhook request timed out after ${params.timeoutMs}ms.`, 504, true);
      }
      if (err instanceof WebhookHttpError) {
        throw err;
      }
      throw new WebhookHttpError(err instanceof Error ? err.message : String(err), 500, true);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retries all failed batches for a specific export job
   */
  public async retryFailedBatches(exportId: string): Promise<ExportJob> {
    const job = this.getJobById(exportId);
    if (!job) throw new Error(`Export job ${exportId} not found.`);

    // Reset failed batches to pending
    db.prepare(`
      UPDATE export_batches
      SET status = 'pending', retry_count = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE export_job_id = ? AND status = 'failed'
    `).run(exportId);

    // Reset failed batches counter on job
    db.prepare(`
      UPDATE export_jobs
      SET status = 'pending', failed_batches = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(exportId);

    // Re-execute
    return this.executeJobTransfer(exportId);
  }

  /**
   * Cancels any pending or in-progress batches for an export job
   */
  public cancelJob(exportId: string): ExportJob {
    db.prepare(`
      UPDATE export_batches
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE export_job_id = ? AND status IN ('pending', 'in_progress', 'retrying')
    `).run(exportId);

    db.prepare(`
      UPDATE export_jobs
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(exportId);

    return this.getJobById(exportId)!;
  }
}

export const webhookTransferService = new WebhookTransferService();
