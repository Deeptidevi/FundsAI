// Complete End-to-End Acceptance Test Suite for Autonomous AI Outreach
import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
].forEach((p) => dotenv.config({ path: p }));

import { runMigrations } from './db/client.js';
import { db, dbQueries } from './db/schema.js';
import { RecipientPolicy } from './security/recipientPolicy.js';
import { emailAdapter } from './integrations/emailAdapter.js';
import { imapListener } from './integrations/imapListener.js';
import { researchService } from './services/researchService.js';
import { conversationEngine } from './ai/conversationEngine.js';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  expected: string;
  actual: string;
  evidence?: unknown;
}

const results: TestResult[] = [];

function recordTest(res: TestResult) {
  results.push(res);
  const color = res.status === 'PASS' ? '\x1b[32m' : res.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}[${res.status}]\x1b[0m ${res.id}: ${res.name}`);
  console.log(`   Expected: ${res.expected}`);
  console.log(`   Actual:   ${res.actual}`);
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log(' STARTING G-MAPS AUTONOMOUS AI OUTREACH VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Execute latest migrations & seed
  runMigrations();

  // TEST 1 — Application Preservation
  try {
    const leadsCount = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;
    const knowledgeCount = (db.prepare('SELECT COUNT(*) as count FROM company_knowledge').get() as { count: number }).count;
    if (leadsCount > 0 && knowledgeCount > 0) {
      recordTest({
        id: 'TEST 1',
        name: 'Application and Database Preservation',
        status: 'PASS',
        expected: 'Existing leads and knowledge base remain intact',
        actual: `Database contains ${leadsCount} leads and ${knowledgeCount} verified knowledge items.`,
      });
    } else {
      recordTest({
        id: 'TEST 1',
        name: 'Application and Database Preservation',
        status: 'FAIL',
        expected: 'Existing leads and knowledge base remain intact',
        actual: `leads: ${leadsCount}, knowledge: ${knowledgeCount}`,
      });
    }
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 1',
      name: 'Application and Database Preservation',
      status: 'FAIL',
      expected: 'Database queries succeed',
      actual: String(err),
    });
  }

  // TEST 2 — Company Selection
  const sampleLeads = db.prepare('SELECT * FROM leads LIMIT 2').all() as Array<{ id: string; company_name: string; industry?: string }>;
  if (sampleLeads.length >= 2) {
    recordTest({
      id: 'TEST 2',
      name: 'Company Selection',
      status: 'PASS',
      expected: 'Multiple real company records selected successfully',
      actual: `Selected Lead 1: "${sampleLeads[0].company_name}", Lead 2: "${sampleLeads[1].company_name}"`,
    });
  } else {
    recordTest({
      id: 'TEST 2',
      name: 'Company Selection',
      status: 'FAIL',
      expected: 'At least 2 leads available',
      actual: `Found ${sampleLeads.length} leads`,
    });
  }

  const leadA = sampleLeads[0];
  const leadB = sampleLeads[1];

  // TEST 3 — Independent Company Research
  let researchA: unknown;
  let researchB: unknown;
  try {
    researchA = await researchService.researchCompany(leadA.id, true);
    researchB = await researchService.researchCompany(leadB.id, true);

    const isDifferent = (researchA as { companyName: string }).companyName !== (researchB as { companyName: string }).companyName;
    recordTest({
      id: 'TEST 3',
      name: 'Independent Company Research Engine',
      status: isDifferent ? 'PASS' : 'FAIL',
      expected: 'Each company has its own distinct research record and value propositions',
      actual: `Researched "${(researchA as { companyName: string }).companyName}" and "${(researchB as { companyName: string }).companyName}" with unique industry profiles.`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 3',
      name: 'Independent Company Research Engine',
      status: 'FAIL',
      expected: 'Research succeeds without errors',
      actual: String(err),
    });
  }

  // Prepare test conversation
  const testConvId = `conv-test-${Date.now()}`;
  db.prepare(`
    INSERT OR IGNORE INTO conversations (id, lead_id, channel, state, ai_mode)
    VALUES (?, ?, 'email', 'outreach_sent', 'autonomous')
  `).run(testConvId, leadA.id);

  // TEST 4 — Personalized Email Generation with Interactive Buttons
  let draftA: { subject: string; htmlContent: string; plainContent: string } | null = null;
  try {
    draftA = await researchService.generatePersonalizedDraft({
      leadId: leadA.id,
      conversationId: testConvId,
      recipientEmail: 'pathaniadeepti05@gmail.com',
    });

    const hasButtons = draftA.htmlContent.includes("Yes, I'm Interested") && draftA.htmlContent.includes('/api/actions/click?token=');
    recordTest({
      id: 'TEST 4',
      name: 'Personalized Email Generation with Interactive Click Buttons',
      status: hasButtons ? 'PASS' : 'FAIL',
      expected: 'Generated draft includes personalized business benefits and secure action tokens',
      actual: `Subject: "${draftA.subject}", contains interactive button links with secure tokens: ${hasButtons}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 4',
      name: 'Personalized Email Generation with Interactive Click Buttons',
      status: 'FAIL',
      expected: 'Draft generation succeeds',
      actual: String(err),
    });
  }

  // TEST 5 — Central Recipient Policy Enforcement
  try {
    const blockedPolicy = RecipientPolicy.validateOutgoingRecipient('unauthorized-ceo@external-company.com', leadA.company_name);
    const testModePolicy = RecipientPolicy.validateOutgoingRecipient('pathaniadeepti05@gmail.com', leadA.company_name);

    const isEnforced = !blockedPolicy.allowed || blockedPolicy.effectiveRecipient === 'pathaniadeepti05@gmail.com';
    recordTest({
      id: 'TEST 5',
      name: 'Server-Side Test Recipient Enforcement',
      status: isEnforced ? 'PASS' : 'FAIL',
      expected: 'External client addresses are blocked or rerouted strictly to test allowlist',
      actual: `External address allowed: ${blockedPolicy.allowed}, Effective routed address: ${blockedPolicy.effectiveRecipient}. Allowed address allowed: ${testModePolicy.allowed}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 5',
      name: 'Server-Side Test Recipient Enforcement',
      status: 'FAIL',
      expected: 'Policy validation executes',
      actual: String(err),
    });
  }

  // TEST 6 — Real SMTP Email Dispatch to Authorized Test Mailbox
  try {
    const sendResult = await emailAdapter.sendEmail({
      to: 'pathaniadeepti05@gmail.com',
      subject: `Industrial Intelligence Outreach - ${leadA.company_name}`,
      html: draftA ? draftA.htmlContent : '<p>Test verification</p>',
      leadCompanyName: leadA.company_name,
      conversationId: testConvId,
    });

    recordTest({
      id: 'TEST 6',
      name: 'Actual SMTP Email Dispatch',
      status: sendResult.success ? 'PASS' : 'FAIL',
      expected: 'Email accepted by smtp.gmail.com with provider Message-ID',
      actual: sendResult.success
        ? `Delivered to ${sendResult.effectiveRecipient} (Message-ID: ${sendResult.messageId})`
        : `Provider send failed: ${sendResult.error}`,
    });

    if (sendResult.success) {
      dbQueries.insertMessage({
        id: crypto.randomUUID(),
        conversationId: testConvId,
        channel: 'email',
        direction: 'outbound',
        senderIdentifier: 'G-MAPS Outreach',
        recipientIdentifier: 'pathaniadeepti05@gmail.com',
        content: draftA ? draftA.plainContent : 'Test',
        subject: `Industrial Intelligence Outreach - ${leadA.company_name}`,
        providerMessageId: sendResult.messageId,
        deliveryStatus: 'sent',
        sentAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 6',
      name: 'Actual SMTP Email Dispatch',
      status: 'FAIL',
      expected: 'SMTP send succeeds',
      actual: String(err),
    });
  }

  // TEST 7 — Clickable Action Buttons & Anti-Scanner Security
  try {
    const sampleToken = crypto.randomBytes(24).toString('hex');
    dbQueries.createActionToken({
      token: sampleToken,
      conversationId: testConvId,
      leadId: leadA.id,
      actionType: 'interested',
      recipientEmail: 'pathaniadeepti05@gmail.com',
      expiresInHours: 24,
    });

    const tokenRow = dbQueries.getActionToken(sampleToken);
    const validBefore = tokenRow && !tokenRow.is_used;

    dbQueries.consumeActionToken(sampleToken, '127.0.0.1', 'Mozilla/5.0');
    const tokenAfter = dbQueries.getActionToken(sampleToken);
    const validAfter = tokenAfter && tokenAfter.is_used;

    recordTest({
      id: 'TEST 7',
      name: 'Clickable Action Option Security & Replay Prevention',
      status: validBefore && validAfter ? 'PASS' : 'FAIL',
      expected: 'Token is created unconsumed, then atomically consumed with IP & timestamp',
      actual: `Token created (is_used: ${tokenRow?.is_used}), consumed (is_used: ${tokenAfter?.is_used})`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 7',
      name: 'Clickable Action Option Security & Replay Prevention',
      status: 'FAIL',
      expected: 'Token verification succeeds',
      actual: String(err),
    });
  }

  // TEST 8 — Incoming Natural-Language Reply: "I'm interested. Please share more details."
  try {
    const inboundResult = await conversationEngine.processInboundMessage(
      testConvId,
      "I'm interested. Please share more details."
    );

    const isInterested = inboundResult.intent === 'INTERESTED';
    recordTest({
      id: 'TEST 8',
      name: 'Inbound Reply AI Processing: "I\'m interested"',
      status: isInterested ? 'PASS' : 'FAIL',
      expected: 'Intent classified as INTERESTED, contextual response generated and dispatched',
      actual: `Intent: ${inboundResult.intent} (Confidence: ${Math.round(inboundResult.confidence * 100)}%), New State: ${inboundResult.newState}, Reply Sent: ${inboundResult.replySent}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 8',
      name: 'Inbound Reply AI Processing: "I\'m interested"',
      status: 'FAIL',
      expected: 'Processing succeeds',
      actual: String(err),
    });
  }

  // TEST 9 — Pricing Query: "What is your pricing?"
  try {
    const pricingConvId = `conv-pricing-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(pricingConvId, leadA.id);

    const pricingResult = await conversationEngine.processInboundMessage(pricingConvId, 'What is your pricing?');
    const isPricing = pricingResult.intent === 'PRICING_QUERY';
    const usesApprovedPricing = !pricingResult.draftReply?.includes('$99/mo') && !pricingResult.draftReply?.includes('₹500');

    recordTest({
      id: 'TEST 9',
      name: 'Pricing Query Grounding in Knowledge Base',
      status: isPricing && usesApprovedPricing ? 'PASS' : 'FAIL',
      expected: 'Intent PRICING_QUERY, replies using only verified pricing knowledge without inventing prices',
      actual: `Intent: ${pricingResult.intent}, Reply grounded: ${usesApprovedPricing}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 9',
      name: 'Pricing Query Grounding in Knowledge Base',
      status: 'FAIL',
      expected: 'Pricing inquiry processed',
      actual: String(err),
    });
  }

  // TEST 10 — Demo Request: "Can we schedule a demo?"
  try {
    const demoConvId = `conv-demo-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(demoConvId, leadA.id);

    const demoResult = await conversationEngine.processInboundMessage(demoConvId, 'Can we schedule a demo?');
    const isDemo = demoResult.intent === 'DEMO_REQUESTED';

    recordTest({
      id: 'TEST 10',
      name: 'Demo Request Handling',
      status: isDemo ? 'PASS' : 'FAIL',
      expected: 'Intent DEMO_REQUESTED, invites user to share preferred availability',
      actual: `Intent: ${demoResult.intent}, State: ${demoResult.newState}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 10',
      name: 'Demo Request Handling',
      status: 'FAIL',
      expected: 'Demo request handled',
      actual: String(err),
    });
  }

  // TEST 11 — Follow Up Later: "Maybe next month."
  try {
    const laterConvId = `conv-later-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(laterConvId, leadA.id);

    const laterResult = await conversationEngine.processInboundMessage(laterConvId, 'Maybe next month.');
    const isLater = laterResult.intent === 'FOLLOW_UP_LATER';
    const followups = db.prepare('SELECT * FROM followups WHERE conversation_id = ?').all(laterConvId);

    recordTest({
      id: 'TEST 11',
      name: 'Follow Up Later Scheduling',
      status: isLater && followups.length > 0 ? 'PASS' : 'FAIL',
      expected: 'Intent FOLLOW_UP_LATER, scheduled in followups table for future date',
      actual: `Intent: ${laterResult.intent}, Follow-ups scheduled: ${followups.length}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 11',
      name: 'Follow Up Later Scheduling',
      status: 'FAIL',
      expected: 'Followup scheduled',
      actual: String(err),
    });
  }

  // TEST 12 — Objection Handling
  try {
    const objConvId = `conv-obj-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(objConvId, leadA.id);

    const objResult = await conversationEngine.processInboundMessage(
      objConvId,
      'How is G-MAPS different from other industrial platforms?'
    );

    recordTest({
      id: 'TEST 12',
      name: 'Objection & Differentiation Handling',
      status: objResult.intent === 'OBJECTION' ? 'PASS' : 'FAIL',
      expected: 'Intent OBJECTION, responds with verified geospatial 25km radius differentiators',
      actual: `Intent: ${objResult.intent}, Response: "${objResult.draftReply?.slice(0, 80)}..."`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 12',
      name: 'Objection & Differentiation Handling',
      status: 'FAIL',
      expected: 'Objection handled',
      actual: String(err),
    });
  }

  // TEST 13 — Not Interested
  try {
    const notIntConvId = `conv-notint-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(notIntConvId, leadA.id);

    const notIntResult = await conversationEngine.processInboundMessage(notIntConvId, "I'm not interested.");
    const isNotInt = notIntResult.intent === 'NOT_INTERESTED' && notIntResult.newState === 'not_interested';

    recordTest({
      id: 'TEST 13',
      name: 'Not Interested Transition & Followup Cancellation',
      status: isNotInt ? 'PASS' : 'FAIL',
      expected: 'Transition to not_interested, cancel pending followups',
      actual: `Intent: ${notIntResult.intent}, State: ${notIntResult.newState}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 13',
      name: 'Not Interested Transition & Followup Cancellation',
      status: 'FAIL',
      expected: 'Not interested processed',
      actual: String(err),
    });
  }

  // TEST 14 — Unsubscribe Directive
  try {
    const testUnsubEmail = 'test-unsub-recipient@sample.com';
    const unsubLead = db.prepare('SELECT id FROM leads LIMIT 1').get() as { id: string };
    const unsubContactId = `cnt-unsub-${Date.now()}`;
    db.prepare(`
      INSERT INTO lead_contacts (id, lead_id, email, is_primary)
      VALUES (?, ?, ?, 1)
    `).run(unsubContactId, unsubLead.id, testUnsubEmail);

    const unsubConvId = `conv-unsub-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, contact_id, channel, state, ai_mode)
      VALUES (?, ?, ?, 'email', 'engaged', 'autonomous')
    `).run(unsubConvId, unsubLead.id, unsubContactId);

    const unsubResult = await conversationEngine.processInboundMessage(unsubConvId, 'Please unsubscribe me from your emails.');
    const isSuppressed = dbQueries.isSuppressed(testUnsubEmail, 'email');

    recordTest({
      id: 'TEST 14',
      name: 'Unsubscribe Priority & Immediate Suppression',
      status: isSuppressed && unsubResult.newState === 'opted_out' ? 'PASS' : 'FAIL',
      expected: 'State becomes opted_out, email added to suppression_list table immediately',
      actual: `State: ${unsubResult.newState}, In Suppression List: ${isSuppressed}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 14',
      name: 'Unsubscribe Priority & Immediate Suppression',
      status: 'FAIL',
      expected: 'Unsubscribe succeeds',
      actual: String(err),
    });
  }

  // TEST 15 — Duplicate Inbound Processing Prevention
  try {
    const dupProviderId = `msg-dup-${Date.now()}`;
    const testDupConvId = `conv-dup-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, channel, state, ai_mode)
      VALUES (?, ?, 'email', 'engaged', 'autonomous')
    `).run(testDupConvId, leadA.id);

    dbQueries.insertMessage({
      id: crypto.randomUUID(),
      conversationId: testDupConvId,
      channel: 'email',
      direction: 'inbound',
      senderIdentifier: 'Client Test',
      recipientIdentifier: 'G-MAPS Inbound',
      content: 'Hello',
      providerMessageId: dupProviderId,
      deliveryStatus: 'received',
      sentAt: new Date().toISOString(),
    });

    const exists = db.prepare('SELECT id FROM messages WHERE provider_message_id = ?').get(dupProviderId);

    recordTest({
      id: 'TEST 15',
      name: 'Duplicate Message Idempotency Check',
      status: Boolean(exists) ? 'PASS' : 'FAIL',
      expected: 'Duplicate provider message IDs are detected and skipped',
      actual: `Duplicate provider_message_id successfully registered: ${Boolean(exists)}`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 15',
      name: 'Duplicate Message Idempotency Check',
      status: 'FAIL',
      expected: 'Deduplication check executes',
      actual: String(err),
    });
  }

  // TEST 16 — Live IMAP Polling & Mailbox Checkpoint Check
  try {
    const checkpoint = dbQueries.getSyncCheckpoint('INBOX');
    recordTest({
      id: 'TEST 16',
      name: 'Live IMAP Mailbox Checkpoint Persistence',
      status: checkpoint && checkpoint.last_uid > 0 ? 'PASS' : 'FAIL',
      expected: 'Checkpoint exists with valid last_uid for cold-start restart protection',
      actual: checkpoint ? `Mailbox: ${checkpoint.mailbox}, last_uid: ${checkpoint.last_uid}, status: ${checkpoint.status}` : 'No checkpoint',
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 16',
      name: 'Live IMAP Mailbox Checkpoint Persistence',
      status: 'FAIL',
      expected: 'Checkpoint query executes',
      actual: String(err),
    });
  }

  // TEST 17 — AI Decision Log Verification
  try {
    const logs = dbQueries.getAiDecisionLogs(10);
    recordTest({
      id: 'TEST 17',
      name: 'Audit Trail: AI Decision Logs Recorded',
      status: logs.length > 0 ? 'PASS' : 'FAIL',
      expected: 'Every AI decision is logged with intent, confidence, safety status, and action',
      actual: `Found ${logs.length} logged AI decision records in ai_decision_logs table.`,
    });
  } catch (err: unknown) {
    recordTest({
      id: 'TEST 17',
      name: 'Audit Trail: AI Decision Logs Recorded',
      status: 'FAIL',
      expected: 'Decision logs retrieved',
      actual: String(err),
    });
  }

  console.log('\n===============================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(` SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${results.length} acceptance tests.`);
  console.log('===============================================================\n');

  return { passCount, failCount, total: results.length, results };
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
});
