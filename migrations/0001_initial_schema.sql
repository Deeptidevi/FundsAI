-- 0001_initial_schema.sql
-- G-MAPS Industrial Intelligence Relational Database Schema
-- Compatible with SQLite 3 and Cloudflare D1

PRAGMA foreign_keys = ON;

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'campaign_manager', 'sales_rep', 'viewer')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. LEADS
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    place_id TEXT UNIQUE,
    company_name TEXT NOT NULL,
    primary_type TEXT,
    tier TEXT CHECK(tier IN ('Gold', 'Silver', 'Bronze', 'Unranked')) DEFAULT 'Unranked',
    rating REAL DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    website TEXT,
    google_maps_url TEXT,
    source TEXT NOT NULL DEFAULT 'manual_import', -- 'gmaps_search', 'excel_import', 'csv_import', etc.
    status TEXT NOT NULL CHECK(status IN ('new', 'contacted', 'engaged', 'qualified', 'meeting_scheduled', 'won', 'lost', 'suppressed')) DEFAULT 'new',
    priority TEXT NOT NULL CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    custom_fields JSON,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_coords ON leads(latitude, longitude);

-- 3. LEAD CONTACTS (Multiple contact channels per company)
CREATE TABLE IF NOT EXISTS lead_contacts (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_name TEXT,
    designation TEXT,
    email TEXT,
    phone_raw TEXT,
    phone_e164 TEXT,
    phone_type TEXT CHECK(phone_type IN ('Mobile', 'Landline', 'TollFree', 'Unknown')) DEFAULT 'Unknown',
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead ON lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_email ON lead_contacts(email);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_phone_e164 ON lead_contacts(phone_e164);

-- 4. CONSENT & OPT-OUT RECORDS
CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES lead_contacts(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK(channel IN ('email', 'whatsapp', 'call')),
    consent_status TEXT NOT NULL CHECK(consent_status IN ('granted', 'opted_out', 'unspecified')) DEFAULT 'unspecified',
    source TEXT NOT NULL, -- 'excel_import_flag', 'opt_in_form', 'stop_reply', etc.
    consent_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_lead_channel ON consent_records(lead_id, channel);

-- 5. SUPPRESSION LIST (Global DNC / opt-out / bounce blacklists)
CREATE TABLE IF NOT EXISTS suppression_list (
    id TEXT PRIMARY KEY,
    identifier TEXT UNIQUE NOT NULL, -- e164 phone or lowercase email
    channel TEXT NOT NULL CHECK(channel IN ('email', 'whatsapp', 'all')),
    reason TEXT NOT NULL CHECK(reason IN ('opt_out', 'hard_bounce', 'spam_complaint', 'manual_block')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppression_identifier ON suppression_list(identifier);

-- 6. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT,
    channels JSON NOT NULL, -- ['email', 'whatsapp']
    status TEXT NOT NULL CHECK(status IN ('draft', 'validating', 'pending_approval', 'approved', 'queued', 'running', 'paused', 'completed', 'cancelled', 'failed')) DEFAULT 'draft',
    target_criteria JSON, -- Filters used for audience
    email_subject TEXT,
    email_body_template TEXT,
    whatsapp_template_name TEXT,
    whatsapp_template_namespace TEXT,
    ai_personalization_rules JSON,
    daily_send_limit INTEGER DEFAULT 100,
    total_leads_targeted INTEGER DEFAULT 0,
    approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    approved_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- 7. CAMPAIGN LEADS (Junction table linking campaigns to targeted contacts)
CREATE TABLE IF NOT EXISTS campaign_leads (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES lead_contacts(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'suppressed', 'opted_out')) DEFAULT 'pending',
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, lead_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);

-- 8. CONVERSATIONS (Omnichannel conversation threads)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES lead_contacts(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK(channel IN ('email', 'whatsapp')),
    external_thread_id TEXT, -- e.g., email Message-ID or WhatsApp contact ID
    state TEXT NOT NULL CHECK(state IN ('new', 'outreach_sent', 'awaiting_reply', 'engaged', 'interested', 'information_requested', 'pricing_requested', 'meeting_requested', 'followup_scheduled', 'not_interested', 'human_handoff', 'opted_out', 'resolved')) DEFAULT 'new',
    ai_mode TEXT NOT NULL CHECK(ai_mode IN ('autonomous', 'copilot_draft', 'paused')) DEFAULT 'copilot_draft',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    last_message_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_state ON conversations(state);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

-- 9. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
    sender_identifier TEXT NOT NULL,
    recipient_identifier TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('email', 'whatsapp')),
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'template', 'document', 'interactive'
    content TEXT NOT NULL,
    subject TEXT,
    provider_message_id TEXT,
    delivery_status TEXT NOT NULL CHECK(delivery_status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')) DEFAULT 'queued',
    provider_response JSON,
    is_ai_generated INTEGER DEFAULT 0,
    ai_intent TEXT,
    ai_confidence REAL,
    error_details TEXT,
    sent_at DATETIME,
    delivered_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_provider_id ON messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);

-- 10. MESSAGE JOBS (Durable asynchronous processing queue)
CREATE TABLE IF NOT EXISTS message_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL CHECK(job_type IN ('send_email', 'send_whatsapp', 'process_inbound', 'generate_ai_reply')),
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    payload JSON NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'leased', 'completed', 'failed', 'dead_letter')) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    lease_token TEXT,
    leased_until DATETIME,
    scheduled_for DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_jobs_status_scheduled ON message_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_message_jobs_idempotency ON message_jobs(idempotency_key);

-- 11. COMPANY KNOWLEDGE BASE (Verified RAG context for AI)
CREATE TABLE IF NOT EXISTS company_knowledge (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK(category IN ('overview', 'products', 'services', 'pricing_policy', 'faq', 'prohibited_claims', 'escalation_policy', 'template')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_knowledge_category ON company_knowledge(category, is_active);

-- 12. FOLLOW-UPS
CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    scheduled_at DATETIME NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('email', 'whatsapp')),
    template_content TEXT,
    status TEXT NOT NULL CHECK(status IN ('scheduled', 'executed', 'cancelled', 'suppressed')) DEFAULT 'scheduled',
    cancel_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON followups(status, scheduled_at);

-- 13. IMPORT JOBS & ERRORS
CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('uploading', 'validating', 'processing', 'completed', 'failed')) DEFAULT 'uploading',
    column_mapping JSON,
    imported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS import_errors (
    id TEXT PRIMARY KEY,
    import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    field_name TEXT,
    raw_value TEXT,
    error_message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_errors_job ON import_errors(import_job_id);

-- 14. WEBHOOK EVENTS (Idempotent event processing)
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK(provider IN ('meta_whatsapp', 'email_provider', 'resend', 'sendgrid')),
    event_id TEXT UNIQUE NOT NULL, -- External ID supplied by provider
    event_type TEXT NOT NULL,
    payload JSON NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0,
    processed_at DATETIME,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON webhook_events(provider, event_id);

-- 15. TEST LAB RUNS (Isolated test history)
CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
    test_type TEXT NOT NULL CHECK(test_type IN ('email_send', 'whatsapp_send', 'inbound_email_reply', 'ai_sandbox', 'rule_validation')),
    recipient TEXT NOT NULL,
    input_payload JSON NOT NULL,
    output_result JSON,
    status TEXT NOT NULL CHECK(status IN ('passed', 'failed', 'running')),
    error_details TEXT,
    executed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. INTEGRATION SETTINGS
CREATE TABLE IF NOT EXISTS integration_settings (
    id TEXT PRIMARY KEY,
    provider TEXT UNIQUE NOT NULL CHECK(provider IN ('meta_whatsapp', 'email_smtp', 'resend', 'google_places', 'gemini_ai')),
    config_json JSON NOT NULL, -- Server-side non-secret configuration
    is_active INTEGER NOT NULL DEFAULT 0,
    health_status TEXT NOT NULL CHECK(health_status IN ('healthy', 'unconfigured', 'degraded', 'error')) DEFAULT 'unconfigured',
    last_health_check DATETIME,
    last_error TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSON,
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
