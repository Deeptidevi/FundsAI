// Dedicated Test Lab Route & Autonomous Outreach Diagnostics
import { Hono } from 'hono';
import crypto from 'node:crypto';
import { db, dbQueries } from '../db/schema.js';
import { emailAdapter } from '../integrations/emailAdapter.js';
import { whatsappAdapter } from '../integrations/whatsappAdapter.js';
import { geminiAdapter } from '../ai/geminiAdapter.js';
import { imapListener } from '../integrations/imapListener.js';
import { researchService } from '../services/researchService.js';
import { conversationEngine } from '../ai/conversationEngine.js';

export const testLabRouter = new Hono();

/**
 * 1. Email Test Mode
 * Restricts sends to explicitly configured/authorized test email.
 * Applies [G-MAPS TEST] subject prefix.
 * Never touches production campaigns or leads.
 */
testLabRouter.post('/email', async (c) => {
  const body = await c.req.json();
  const testRecipient = body.recipient ? String(body.recipient).trim() : process.env.TEST_ALLOWLIST_EMAIL;

  if (!testRecipient) {
    return c.json(
      {
        success: false,
        error: 'Test recipient email is required (or configure TEST_ALLOWLIST_EMAIL in server .env).',
      },
      400
    );
  }

  // Verify recipient matches test allowlist if configured
  const allowedEmail = process.env.TEST_ALLOWLIST_EMAIL;
  if (allowedEmail && testRecipient.toLowerCase() !== allowedEmail.toLowerCase()) {
    return c.json(
      {
        success: false,
        error: `Security Violation: Test mode can ONLY send to authorized test recipient (${allowedEmail}).`,
      },
      403
    );
  }

  const runId = `test-email-${Date.now()}`;
  const subject = body.subject || 'Industrial Automation Capabilities Test';
  const content = body.content || '<p>This is a verified test email sent from the G-MAPS Test Lab environment.</p>';

  // Execute test email via real SMTP provider
  const sendRes = await emailAdapter.sendEmail({
    to: testRecipient,
    subject,
    html: content,
    isTestMode: true,
  });

  // Record test execution history in isolated test_runs table
  dbQueries.insertTestRun({
    id: runId,
    testType: 'email_send',
    recipient: testRecipient,
    inputPayload: { subject, content },
    outputResult: sendRes as unknown as Record<string, unknown>,
    status: sendRes.success ? 'passed' : 'failed',
    errorDetails: sendRes.error,
  });

  return c.json({
    success: sendRes.success,
    runId,
    result: sendRes,
  });
});

/**
 * 2. Real Mailbox IMAP Sync Trigger
 * Connects to imap.gmail.com:993, fetches new replies, matches conversations, and triggers AI agent.
 */
testLabRouter.post('/sync-inbox', async (c) => {
  try {
    const result = await imapListener.syncInbox();
    return c.json({
      success: result.success,
      messagesProcessed: result.messagesProcessed,
      matchedConversations: result.matchedConversations,
      lastUid: result.lastUid,
      error: result.error,
    });
  } catch (err: unknown) {
    return c.json(
      {
        success: false,
        error: `IMAP synchronization error: ${err instanceof Error ? err.message : String(err)}`,
      },
      500
    );
  }
});

/**
 * 3. Mailbox Sync Checkpoint & Status
 */
testLabRouter.get('/sync-status', (c) => {
  const checkpoint = dbQueries.getSyncCheckpoint('INBOX');
  const emailHealth = emailAdapter.checkHealth();
  const geminiHealth = geminiAdapter.checkHealth();

  return c.json({
    checkpoint: checkpoint || { mailbox: 'INBOX', last_uid: 0, status: 'uninitialized' },
    emailHealth,
    geminiHealth,
    testAllowlistEmail: process.env.TEST_ALLOWLIST_EMAIL || 'not_configured',
    emailMode: process.env.EMAIL_MODE || 'TEST',
  });
});

/**
 * 4. Company Research Engine Execution
 */
testLabRouter.post('/research', async (c) => {
  const body = await c.req.json();
  const leadId = body.leadId;

  if (!leadId) {
    return c.json({ error: 'leadId is required.' }, 400);
  }

  try {
    const research = await researchService.researchCompany(leadId, body.forceRefresh);
    return c.json({ success: true, research });
  } catch (err: unknown) {
    return c.json({ error: `Research failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});

/**
 * 5. Generate Personalized Draft with Interactive Click Buttons
 */
testLabRouter.post('/generate-draft', async (c) => {
  const body = await c.req.json();
  const leadId = body.leadId;
  const conversationId = body.conversationId || `conv-test-${Date.now()}`;
  const recipientEmail = body.recipientEmail || process.env.TEST_ALLOWLIST_EMAIL || 'pathaniadeepti05@gmail.com';

  if (!leadId) {
    return c.json({ error: 'leadId is required.' }, 400);
  }

  try {
    const draft = await researchService.generatePersonalizedDraft({
      leadId,
      conversationId,
      campaignId: body.campaignId,
      recipientEmail,
    });
    return c.json({ success: true, draft });
  } catch (err: unknown) {
    return c.json({ error: `Draft generation failed: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});

/**
 * 6. Simulate / Replay Inbound Reply
 * Allows testing the full 14-intent pipeline, knowledge retrieval, and autonomous response dispatch
 */
testLabRouter.post('/simulate-reply', async (c) => {
  const body = await c.req.json();
  let conversationId = body.conversationId;
  const messageText = body.messageText || body.message;

  if (!messageText) {
    return c.json({ error: 'messageText is required.' }, 400);
  }

  // If no conversationId provided, pick or create an active test conversation
  if (!conversationId) {
    const recent = db.prepare(`SELECT id FROM conversations WHERE channel = 'email' ORDER BY last_message_at DESC LIMIT 1`).get() as { id: string } | undefined;
    if (recent) {
      conversationId = recent.id;
    } else {
      // Find first lead
      const lead = db.prepare('SELECT id FROM leads LIMIT 1').get() as { id: string } | undefined;
      if (!lead) return c.json({ error: 'No leads available in database to simulate conversation with.' }, 400);

      conversationId = `conv-sim-${Date.now()}`;
      db.prepare(`
        INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
        VALUES (?, ?, 'email', 'outreach_sent', 'autonomous')
      `).run(conversationId, lead.id);
    }
  }

  try {
    const inboundMsgId = crypto.randomUUID();
    // Record inbound message
    dbQueries.insertMessage({
      id: inboundMsgId,
      conversationId,
      direction: 'inbound',
      senderIdentifier: 'Test Simulation Mailbox',
      recipientIdentifier: 'G-MAPS Inbound Agent',
      channel: 'email',
      messageType: 'text',
      content: messageText,
      subject: 'Simulated Client Reply',
      deliveryStatus: 'received',
      sentAt: new Date().toISOString(),
    });

    // Process through Conversation Engine
    const result = await conversationEngine.processInboundMessage(conversationId, messageText, inboundMsgId);

    return c.json({
      success: true,
      conversationId,
      result,
    });
  } catch (err: unknown) {
    return c.json(
      {
        success: false,
        error: `Simulation error: ${err instanceof Error ? err.message : String(err)}`,
      },
      500
    );
  }
});

/**
 * 7. AI Decision Logs
 */
testLabRouter.get('/ai-decision-logs', (c) => {
  const logs = dbQueries.getAiDecisionLogs(50);
  return c.json({ logs });
});

/**
 * 8. WhatsApp Test Mode
 */
testLabRouter.post('/whatsapp', async (c) => {
  const body = await c.req.json();
  const testPhone = body.phone ? String(body.phone).trim() : process.env.TEST_ALLOWLIST_PHONE;

  if (!testPhone) {
    return c.json(
      {
        success: false,
        error: 'Test phone number is required (or configure TEST_ALLOWLIST_PHONE in server .env).',
      },
      400
    );
  }

  const allowedPhone = process.env.TEST_ALLOWLIST_PHONE;
  if (allowedPhone && testPhone.replace(/[^\d]/g, '') !== allowedPhone.replace(/[^\d]/g, '')) {
    return c.json(
      {
        success: false,
        error: `Security Violation: Test mode can ONLY send to authorized test phone (${allowedPhone}).`,
      },
      403
    );
  }

  const runId = `test-wa-${Date.now()}`;
  const text = body.text || 'G-MAPS Test Lab: Verifying official Meta WhatsApp Business Cloud API integration.';

  const sendRes = await whatsappAdapter.sendMessage({
    to: testPhone,
    type: 'text',
    text,
    isTestMode: true,
  });

  dbQueries.insertTestRun({
    id: runId,
    testType: 'whatsapp_send',
    recipient: testPhone,
    inputPayload: { text },
    outputResult: sendRes as unknown as Record<string, unknown>,
    status: sendRes.success ? 'passed' : 'failed',
    errorDetails: sendRes.error,
  });

  return c.json({
    success: sendRes.success,
    runId,
    result: sendRes,
  });
});

/**
 * 9. AI Conversation Sandbox
 */
testLabRouter.post('/ai-sandbox', async (c) => {
  const body = await c.req.json();
  const message = body.message || 'We are looking for CNC machine tooling for high-precision components. Can you share pricing and lead time?';
  const companyName = body.companyName || 'Apex Industrial Fabrication';

  const intentResult = await geminiAdapter.classifyIntent(message);
  const replyResult = await geminiAdapter.generateResponse({
    incomingMessage: message,
    leadCompanyName: companyName,
    intent: intentResult.intent,
  });

  const runId = `test-ai-${Date.now()}`;
  dbQueries.insertTestRun({
    id: runId,
    testType: 'ai_sandbox',
    recipient: 'Sandbox Simulation',
    inputPayload: { message, companyName },
    outputResult: { intent: intentResult, reply: replyResult },
    status: 'passed',
  });

  return c.json({
    success: true,
    runId,
    intent: intentResult,
    reply: replyResult,
  });
});

/**
 * 10. Test Execution History
 */
testLabRouter.get('/runs', (c) => {
  const runs = dbQueries.getTestRuns(50);
  return c.json({ runs });
});
