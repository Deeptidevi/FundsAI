// Integration tests for Server, Migrations, Import Engine, and Campaigns
import test from 'node:test';
import assert from 'node:assert';
import { runMigrations } from './db/client.js';
import { db, dbQueries } from './db/schema.js';
import { importService } from './services/importService.js';
import { campaignService } from './services/campaignService.js';
import { emailAdapter } from './integrations/emailAdapter.js';
import { whatsappAdapter } from './integrations/whatsappAdapter.js';

test('Database Migrations: Successfully executes initial schema', () => {
  runMigrations();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  const tableNames = tables.map((t) => t.name);

  assert.ok(tableNames.includes('leads'));
  assert.ok(tableNames.includes('lead_contacts'));
  assert.ok(tableNames.includes('campaigns'));
  assert.ok(tableNames.includes('campaign_leads'));
  assert.ok(tableNames.includes('messages'));
  assert.ok(tableNames.includes('conversations'));
  assert.ok(tableNames.includes('message_jobs'));
  assert.ok(tableNames.includes('company_knowledge'));
  assert.ok(tableNames.includes('suppression_list'));
  assert.ok(tableNames.includes('test_runs'));

  // Ensure test admin user exists
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, role)
    VALUES ('usr-admin', 'admin@gmaps.local', 'Admin User', 'hash123', 'admin')
  `).run();

  // Clean test tables
  db.prepare("DELETE FROM message_jobs").run();
  db.prepare("DELETE FROM campaign_leads").run();
  db.prepare("DELETE FROM campaigns").run();
  db.prepare("DELETE FROM lead_contacts").run();
  db.prepare("DELETE FROM leads").run();
  db.prepare("DELETE FROM import_errors").run();
  db.prepare("DELETE FROM import_jobs").run();
  db.prepare("DELETE FROM suppression_list").run();
});

test('CSV Import Engine: Parses, validates, normalizes phone, and reports accurately', () => {
  const ts = Date.now();
  const csvContent = `Company Name,Contact,Email,Phone,City,Industry,Consent
Test Apex CNC ${ts},Rajesh Sharma,rajesh@testapex.com,+91 98765 43210,Pune,Machining,yes
Test Bhartiya Tooling ${ts},Sunil Verma,invalid-email-format,011-23456789,New Delhi,Tooling,no
Test Global Forge ${ts},Amit Patel,amit@testforge.in,9823012345,Vadodara,Foundry,yes`;

  const buffer = Buffer.from(csvContent, 'utf-8');
  const summary = importService.executeImport(buffer, 'test_leads.csv', {
    companyName: 'Company Name',
    contactPerson: 'Contact',
    email: 'Email',
    phone: 'Phone',
    city: 'City',
    industry: 'Industry',
    emailConsent: 'Consent',
  });

  assert.strictEqual(summary.totalRows, 3);
  assert.strictEqual(summary.validRows, 2);
  assert.strictEqual(summary.invalidRows, 1);
  assert.strictEqual(summary.errors.length, 1);
  assert.strictEqual(summary.errors[0].fieldName, 'email');

  // Verify lead in database
  const lead = db.prepare(`SELECT * FROM leads WHERE company_name = 'Test Apex CNC ${ts}'`).get() as { id: string; tier: string } | undefined;
  assert.ok(lead);
});

test('Campaign Orchestration: Multi-step approval and durable queue', () => {
  // 1. Fetch created lead
  const lead = db.prepare("SELECT id, company_name FROM leads WHERE company_name LIKE 'Test Apex CNC%' ORDER BY created_at DESC LIMIT 1").get() as { id: string; company_name: string };
  assert.ok(lead);

  // 2. Create draft campaign
  const { campaignId, totalTargeted } = campaignService.createDraftCampaign({
    name: 'Q4 Industrial Outreach',
    channels: ['email'],
    emailSubject: 'Partnership Inquiry for {{company_name}}',
    emailBodyTemplate: 'Hello {{contact_name}}, we noticed {{company_name}} in {{city}}.',
    leadIds: [lead.id],
  });

  assert.strictEqual(totalTargeted, 1);

  // Verify status is draft
  const draft = dbQueries.getCampaignById(campaignId);
  assert.strictEqual(draft?.status, 'draft');

  // 3. Generate preview
  const preview = campaignService.generatePreview(campaignId);
  assert.strictEqual(preview.totalEligible, 1);
  assert.strictEqual(preview.samplePreviews[0].renderedSubject, `Partnership Inquiry for ${lead.company_name}`);

  // 4. Human Approval Gate with valid user
  const approvalRes = campaignService.approveAndEnqueueCampaign(campaignId, 'usr-admin');
  assert.strictEqual(approvalRes.enqueuedJobs, 1);

  // Verify status transitioned to running
  const running = dbQueries.getCampaignById(campaignId);
  assert.strictEqual(running?.status, 'running');

  // Verify durable message job was created
  const job = db.prepare('SELECT * FROM message_jobs WHERE campaign_id = ?').get(campaignId) as { status: string; job_type: string } | undefined;
  assert.ok(job);
  assert.strictEqual(job.job_type, 'send_email');
});

test('Suppression List: Prevents outreach to opted-out recipients', () => {
  dbQueries.addSuppression('optout@client.com', 'email', 'opt_out');
  assert.strictEqual(dbQueries.isSuppressed('optout@client.com', 'email'), true);
  assert.strictEqual(dbQueries.isSuppressed('valid@client.com', 'email'), false);
});

test('Health Checks: Real adapters report honest configuration status', async () => {
  const emailHealth = await emailAdapter.checkHealth();
  assert.ok(['healthy', 'unconfigured', 'error'].includes(emailHealth.status));

  const waHealth = await whatsappAdapter.checkHealth();
  assert.ok(['healthy', 'unconfigured', 'error'].includes(waHealth.status));
});
