// Omnichannel Unified Inbox API Router
import { Hono } from 'hono';
import { db, dbQueries } from '../db/schema.js';
import { conversationEngine } from '../ai/conversationEngine.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
import { whatsappAdapter } from '../integrations/whatsappAdapter.js';
export const inboxRouter = new Hono();
// List conversations
inboxRouter.get('/', (c) => {
    const channel = c.req.query('channel');
    const state = c.req.query('state');
    const conversations = dbQueries.getConversations(channel, state);
    return c.json({ conversations });
});
// Get messages for a specific conversation
inboxRouter.get('/:id/messages', (c) => {
    const id = c.req.param('id');
    const messages = dbQueries.getMessagesByConversation(id);
    const conv = db.prepare(`
    SELECT c.*, l.company_name, l.city, lc.contact_name, lc.email, lc.phone_e164
    FROM conversations c
    JOIN leads l ON c.lead_id = l.id
    LEFT JOIN lead_contacts lc ON c.contact_id = lc.id
    WHERE c.id = ?
  `).get(id);
    if (!conv) {
        return c.json({ error: 'Conversation not found' }, 404);
    }
    return c.json({ conversation: conv, messages });
});
// Human sends direct message / reply in inbox
inboxRouter.post('/:id/messages', async (c) => {
    const conversationId = c.req.param('id');
    const body = await c.req.json();
    const content = body.content;
    if (!content) {
        return c.json({ error: 'Message content is required.' }, 400);
    }
    const conv = db.prepare(`
    SELECT c.*, lc.email, lc.phone_e164
    FROM conversations c
    LEFT JOIN lead_contacts lc ON c.contact_id = lc.id
    WHERE c.id = ?
  `).get(conversationId);
    if (!conv) {
        return c.json({ error: 'Conversation not found.' }, 404);
    }
    let sendResult;
    if (conv.channel === 'email') {
        if (!conv.email)
            return c.json({ error: 'Lead has no email contact on file.' }, 400);
        sendResult = await emailAdapter.sendEmail({
            to: conv.email,
            subject: body.subject || 'Re: G-MAPS Industrial Intelligence',
            html: content,
        });
    }
    else {
        if (!conv.phone_e164)
            return c.json({ error: 'Lead has no phone contact on file.' }, 400);
        sendResult = await whatsappAdapter.sendMessage({
            to: conv.phone_e164,
            type: 'text',
            text: content,
        });
    }
    if (!sendResult.success) {
        return c.json({ error: sendResult.error || 'Failed to dispatch message.' }, 500);
    }
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    dbQueries.insertMessage({
        id: msgId,
        conversationId,
        direction: 'outbound',
        senderIdentifier: 'Human Agent',
        recipientIdentifier: conv.channel === 'email' ? conv.email : conv.phone_e164,
        channel: conv.channel,
        messageType: 'text',
        content,
        subject: body.subject,
        providerMessageId: sendResult.messageId,
        deliveryStatus: 'sent',
        sentAt: new Date().toISOString(),
    });
    return c.json({ success: true, messageId: msgId });
});
// Human Takeover / State update
inboxRouter.patch('/:id/state', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const state = body.state;
    if (!state)
        return c.json({ error: 'state is required.' }, 400);
    db.prepare(`UPDATE conversations SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(state, id);
    return c.json({ success: true, state });
});
// Autonomous vs Copilot AI Mode toggle
inboxRouter.patch('/:id/ai-mode', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const aiMode = body.aiMode;
    if (!['autonomous', 'copilot'].includes(aiMode)) {
        return c.json({ error: "aiMode must be 'autonomous' or 'copilot'" }, 400);
    }
    db.prepare(`UPDATE conversations SET ai_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(aiMode, id);
    return c.json({ success: true, aiMode });
});
// Trigger AI Draft suggestion for active thread
inboxRouter.post('/:id/suggest-draft', async (c) => {
    const id = c.req.param('id');
    const messages = dbQueries.getMessagesByConversation(id);
    const lastInbound = messages.filter((m) => m.direction === 'inbound').pop();
    if (!lastInbound) {
        return c.json({ error: 'No inbound message found to draft reply for.' }, 400);
    }
    try {
        const res = await conversationEngine.processInboundMessage(id, lastInbound.content);
        return c.json(res);
    }
    catch (err) {
        return c.json({ error: `Draft generation failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
});
