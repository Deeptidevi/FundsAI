// Webhooks API Router for Meta WhatsApp and Inbound Email Replies
import { Hono } from 'hono';
import { whatsappAdapter } from '../integrations/whatsappAdapter.js';
import { conversationEngine } from '../ai/conversationEngine.js';
import { db, dbQueries } from '../db/schema.js';
export const webhooksRouter = new Hono();
/**
 * Meta WhatsApp Webhook Challenge Verification (GET)
 */
webhooksRouter.get('/whatsapp', (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');
    const result = whatsappAdapter.verifyWebhookChallenge({ mode, token, challenge });
    if (result.verified && result.challenge) {
        return c.text(result.challenge, 200);
    }
    return c.text('Forbidden: Webhook challenge verification failed.', 403);
});
/**
 * Meta WhatsApp Event Ingestion (POST)
 */
webhooksRouter.post('/whatsapp', async (c) => {
    const payload = await c.req.json();
    const result = whatsappAdapter.processWebhookPayload(payload);
    return c.json({ status: 'ok', processed: result.processedEvents });
});
/**
 * Inbound Email Webhook (e.g., from Mailgun, SendGrid, Resend, or IMAP sync daemon)
 */
webhooksRouter.post('/email', async (c) => {
    const body = await c.req.json();
    const from = body.from || '';
    const to = body.to || '';
    const subject = body.subject || '';
    const text = body.text || body.html || '';
    const messageId = body.messageId || `eml-in-${Date.now()}`;
    if (!from || !text) {
        return c.json({ error: 'from and text/html fields are required.' }, 400);
    }
    // Deduplicate
    const existing = db.prepare('SELECT id FROM webhook_events WHERE event_id = ?').get(messageId);
    if (existing)
        return c.json({ status: 'already_processed' });
    db.prepare(`
    INSERT INTO webhook_events (id, provider, event_id, event_type, payload, processed)
    VALUES (?, 'email_provider', ?, 'inbound_email', ?, 1)
  `).run(`evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, messageId, JSON.stringify(body));
    // Find contact by email
    const cleanFrom = from.toLowerCase().replace(/.*<([^>]+)>.*/, '$1').trim();
    const contact = db.prepare('SELECT id, lead_id FROM lead_contacts WHERE email = ?').get(cleanFrom);
    if (contact) {
        // Find or create conversation
        let conv = db.prepare('SELECT id FROM conversations WHERE contact_id = ? AND channel = "email"').get(contact.id);
        if (!conv) {
            const convId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            db.prepare(`
        INSERT INTO conversations (id, lead_id, contact_id, channel, state)
        VALUES (?, ?, ?, 'email', 'engaged')
      `).run(convId, contact.lead_id, contact.id);
            conv = { id: convId };
        }
        dbQueries.insertMessage({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            conversationId: conv.id,
            direction: 'inbound',
            senderIdentifier: cleanFrom,
            recipientIdentifier: to,
            channel: 'email',
            messageType: 'text',
            content: text,
            subject,
            providerMessageId: messageId,
            deliveryStatus: 'received',
        });
        // Run AI Conversation Engine to evaluate state and draft response
        await conversationEngine.processInboundMessage(conv.id, text);
    }
    return c.json({ status: 'ok' });
});
/**
 * Mock External AI Agent Dashboard Webhook Receiver
 * Emulates the exact receiver contract expected by the external dashboard.
 * Supports simulate query params (?simulate=error, ?simulate=rate_limit, ?simulate=delay) for testing.
 */
webhooksRouter.post('/mock-ai-dashboard', async (c) => {
    const simulate = c.req.query('simulate');
    if (simulate === 'error') {
        return c.json({ error: 'Simulated internal server error from AI Dashboard receiver' }, 500);
    }
    if (simulate === 'rate_limit') {
        return c.json({ error: 'Simulated rate limit exceeded from AI Dashboard receiver' }, 429);
    }
    if (simulate === 'duplicate') {
        return c.json({
            success: true,
            status: 'DUPLICATE_ACKNOWLEDGED',
            message: 'Batch already received and processed. Duplicate upload acknowledged.',
        }, 409);
    }
    if (simulate === 'checksum_mismatch') {
        return c.json({
            success: false,
            error: 'CHECKSUM_MISMATCH',
            message: 'Computed SHA-256 does not match metadata checksumSha256.',
        }, 400);
    }
    if (simulate === 'unauthorized') {
        return c.json({
            success: false,
            error: 'INVALID_AUTHENTICATION',
            message: 'Bearer token or signature mismatch.',
        }, 401);
    }
    if (simulate === 'delay') {
        await new Promise((resolve) => setTimeout(resolve, 3500));
    }
    try {
        const body = await c.req.parseBody();
        const file = (body['file'] || body['excel_file']);
        const exportId = body['export_id'];
        const batchId = body['batch_id'];
        const batchNumber = parseInt(body['batch_number'] || '1', 10);
        const totalBatches = parseInt(body['total_batches'] || '1', 10);
        const recordCount = parseInt(body['record_count'] || '0', 10);
        const idempotencyKey = body['idempotency_key'];
        const checksumSha256 = body['checksum_sha256'];
        if (!exportId || !batchId || !idempotencyKey) {
            return c.json({
                error: 'Missing required webhook batch metadata (export_id, batch_id, idempotency_key).',
            }, 400);
        }
        let fileSize = 0;
        let fileName = 'unknown.xlsx';
        if (file && typeof file !== 'string' && file instanceof File) {
            fileSize = file.size;
            fileName = file.name;
        }
        // Verify HMAC header if secret is configured in receiver
        const webhookSecret = process.env.AI_DASHBOARD_SIGNING_SECRET || process.env.AI_DASHBOARD_WEBHOOK_SECRET;
        const rawSignature = c.req.header('X-FundsAI-Signature') || c.req.header('X-Signature-SHA256');
        const receivedSignature = rawSignature ? rawSignature.replace(/^sha256=/, '') : null;
        if (webhookSecret && receivedSignature) {
            const timestamp = body['timestamp'] || '';
            const canonicalString = `${checksumSha256 || ''}:${batchId}:${timestamp}`;
            const legacyPayload = `${exportId}:${batchId}:${idempotencyKey}:${checksumSha256 || ''}`;
            const hmacCanonical = (await import('node:crypto')).default
                .createHmac('sha256', webhookSecret)
                .update(canonicalString)
                .digest('hex');
            const hmacLegacy = (await import('node:crypto')).default
                .createHmac('sha256', webhookSecret)
                .update(legacyPayload)
                .digest('hex');
            if (receivedSignature !== hmacCanonical && receivedSignature !== hmacLegacy) {
                return c.json({ error: 'Unauthorized: Webhook signature mismatch.' }, 401);
            }
        }
        console.log(`[AI Dashboard Mock Receiver] Acknowledged Batch ${batchNumber}/${totalBatches} (${recordCount} records, file: ${fileName}, ${fileSize} bytes)`);
        return c.json({
            success: true,
            status: 'ACKNOWLEDGED',
            acknowledged: true,
            batch_id: batchId,
            export_id: exportId,
            batch_number: batchNumber,
            total_batches: totalBatches,
            received_records: recordCount,
            file_name: fileName,
            file_size_bytes: fileSize,
            checksum_sha256: checksumSha256,
            receiver_service: 'External AI Agent Dashboard Mock Receiver',
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        return c.json({
            error: `Mock receiver failed to process batch: ${err instanceof Error ? err.message : String(err)}`,
        }, 400);
    }
});
