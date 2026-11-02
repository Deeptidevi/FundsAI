-- 0004_excel_export_and_webhooks.sql
-- Production schema for Excel Export Jobs, Webhook Batches, and Delivery Tracking

PRAGMA foreign_keys = ON;

-- 1. EXPORT JOBS
CREATE TABLE IF NOT EXISTS export_jobs (
    id TEXT PRIMARY KEY,                       -- e.g. EXP-2026-XXXXX
    export_type TEXT NOT NULL CHECK(export_type IN ('excel_download', 'ai_dashboard_webhook')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    total_records INTEGER NOT NULL DEFAULT 0,
    batch_size INTEGER NOT NULL DEFAULT 100,
    total_batches INTEGER NOT NULL DEFAULT 0,
    successful_batches INTEGER NOT NULL DEFAULT 0,
    failed_batches INTEGER NOT NULL DEFAULT 0,
    delivered_records INTEGER NOT NULL DEFAULT 0,
    target_webhook_url TEXT,
    idempotency_key TEXT UNIQUE,
    error_message TEXT,
    metadata JSON,                             -- Selected filters, options, checksums
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON export_jobs(created_at);

-- 2. EXPORT BATCHES (Granular tracking for 100-company batches sent to AI Dashboard)
CREATE TABLE IF NOT EXISTS export_batches (
    id TEXT PRIMARY KEY,                       -- e.g. BATCH-EXP-2026-XXXXX-001
    export_job_id TEXT NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    total_batches INTEGER NOT NULL,
    record_start_index INTEGER NOT NULL,       -- 1-based start
    record_end_index INTEGER NOT NULL,         -- 1-based end
    record_count INTEGER NOT NULL,
    company_ids JSON NOT NULL,                 -- List of company IDs in this batch
    status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'success', 'retrying', 'failed', 'cancelled')) DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    idempotency_key TEXT UNIQUE NOT NULL,
    checksum_sha256 TEXT,
    http_status INTEGER,
    error_message TEXT,
    acknowledgement_data JSON,
    sent_at DATETIME,
    acknowledged_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_batches_job ON export_batches(export_job_id);
CREATE INDEX IF NOT EXISTS idx_export_batches_status ON export_batches(status);
CREATE INDEX IF NOT EXISTS idx_export_batches_idempotency ON export_batches(idempotency_key);
