// Durable Background Job Processing Queue with Leases, Retries, and Backoff
import { db, dbQueries } from '../db/schema.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
import { whatsappAdapter } from '../integrations/whatsappAdapter.js';
export class JobWorker {
    isRunning = false;
    intervalHandle = null;
    leaseDurationSeconds = 60;
    /**
     * Starts the background processing loop
     */
    start(pollIntervalMs = 5000) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.intervalHandle = setInterval(() => {
            this.processNextBatch().catch(() => { });
        }, pollIntervalMs);
    }
    stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        this.isRunning = false;
    }
    /**
     * Enqueues a message job with unique idempotency key
     */
    enqueueJob(jobType, payload, idempotencyKey) {
        const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        db.prepare(`
      INSERT OR IGNORE INTO message_jobs (
        id, job_type, campaign_id, payload, status, idempotency_key, scheduled_for
      ) VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
    `).run(id, jobType, payload.campaignId || null, JSON.stringify(payload), idempotencyKey);
        return id;
    }
    /**
     * Leases and processes available pending or expired lease jobs
     */
    async processNextBatch(batchSize = 5) {
        // 1. Recover expired leases (orphaned jobs whose worker crashed)
        db.prepare(`
      UPDATE message_jobs
      SET status = 'pending', lease_token = NULL, leased_until = NULL
      WHERE status = 'leased' AND datetime(leased_until) < datetime('now')
    `).run();
        // 2. Select eligible pending jobs
        const leaseToken = `worker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const pendingJobs = db.prepare(`
      SELECT * FROM message_jobs
      WHERE status = 'pending' AND datetime(scheduled_for) <= datetime('now')
      LIMIT ?
    `).all(batchSize);
        if (pendingJobs.length === 0)
            return 0;
        let processedCount = 0;
        for (const job of pendingJobs) {
            // Atomic lease
            const updateResult = db.prepare(`
        UPDATE message_jobs
        SET status = 'leased', lease_token = ?, leased_until = datetime('now', '+${this.leaseDurationSeconds} seconds'), attempts = attempts + 1
        WHERE id = ? AND status = 'pending'
      `).run(leaseToken, job.id);
            if (updateResult.changes === 0)
                continue; // Concurrently acquired
            const payload = JSON.parse(job.payload);
            try {
                if (job.job_type === 'send_email') {
                    // Find or create conversation first to get conversationId for threading
                    let conv = db.prepare(`
            SELECT id FROM conversations WHERE lead_id = ? AND channel = 'email'
          `).get(payload.leadId);
                    if (!conv) {
                        const newConvId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                        db.prepare(`
              INSERT INTO conversations (id, lead_id, contact_id, channel, state)
              VALUES (?, ?, ?, 'email', 'outreach_sent')
            `).run(newConvId, payload.leadId, payload.contactId || null);
                        conv = { id: newConvId };
                    }
                    const lead = db.prepare('SELECT company_name FROM leads WHERE id = ?').get(payload.leadId);
                    const res = await emailAdapter.sendEmail({
                        to: payload.recipient,
                        subject: payload.subject || 'Industrial Update from G-MAPS',
                        html: payload.content,
                        leadCompanyName: lead?.company_name,
                        conversationId: conv.id,
                    });
                    if (!res.success) {
                        throw new Error(res.error || 'Failed sending email.');
                    }
                    // Record outbound message
                    this.recordSentMessage(job.campaign_id, payload, res.messageId, 'email', conv.id);
                }
                else if (job.job_type === 'send_whatsapp') {
                    const res = await whatsappAdapter.sendMessage({
                        to: payload.recipient,
                        type: payload.templateName ? 'template' : 'text',
                        text: payload.content,
                        templateName: payload.templateName,
                        templateComponents: payload.templateComponents,
                    });
                    if (!res.success) {
                        throw new Error(res.error || 'Failed sending WhatsApp message.');
                    }
                    this.recordSentMessage(job.campaign_id, payload, res.messageId, 'whatsapp');
                }
                // Mark completed
                db.prepare(`
          UPDATE message_jobs
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(job.id);
                processedCount++;
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                const nextAttempts = job.attempts + 1;
                if (nextAttempts >= job.max_attempts) {
                    // Permanently failed (Dead Letter Queue)
                    db.prepare(`
            UPDATE message_jobs
            SET status = 'dead_letter', last_error = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(errMsg, job.id);
                }
                else {
                    // Exponential backoff retry: 30s * 2^attempts
                    const backoffSeconds = Math.min(30 * Math.pow(2, job.attempts), 3600);
                    db.prepare(`
            UPDATE message_jobs
            SET status = 'pending', lease_token = NULL, leased_until = NULL, last_error = ?,
                scheduled_for = datetime('now', '+${backoffSeconds} seconds'), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(errMsg, job.id);
                }
            }
        }
        return processedCount;
    }
    recordSentMessage(campaignId, payload, providerMessageId, channel, existingConvId) {
        // Find or create conversation
        let convId = existingConvId;
        if (!convId) {
            let conv = db.prepare(`
        SELECT id FROM conversations WHERE lead_id = ? AND channel = ?
      `).get(payload.leadId, channel);
            if (!conv) {
                convId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                db.prepare(`
          INSERT INTO conversations (id, lead_id, contact_id, channel, state)
          VALUES (?, ?, ?, ?, 'outreach_sent')
        `).run(convId, payload.leadId, payload.contactId || null, channel);
            }
            else {
                convId = conv.id;
                db.prepare(`UPDATE conversations SET state = 'outreach_sent' WHERE id = ?`).run(convId);
            }
        }
        else {
            db.prepare(`UPDATE conversations SET state = 'outreach_sent' WHERE id = ?`).run(convId);
        }
        dbQueries.insertMessage({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            conversationId: convId,
            campaignId: campaignId || undefined,
            direction: 'outbound',
            senderIdentifier: 'G-MAPS',
            recipientIdentifier: payload.recipient,
            channel,
            messageType: payload.templateName ? 'template' : 'text',
            content: payload.content,
            subject: payload.subject,
            providerMessageId,
            deliveryStatus: 'sent',
            sentAt: new Date().toISOString(),
        });
        // Update campaign lead status
        if (campaignId) {
            db.prepare(`
        UPDATE campaign_leads
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE campaign_id = ? AND lead_id = ?
      `).run(campaignId, payload.leadId);
        }
    }
}
export const jobWorker = new JobWorker();
