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
