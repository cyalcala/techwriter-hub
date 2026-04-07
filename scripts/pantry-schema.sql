-- V12 Sifter: Supabase "Chopping Board" Schema
-- Run this in your Supabase SQL Editor.

-- 1. Create the Table
CREATE TABLE IF NOT EXISTS raw_job_harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT UNIQUE NOT NULL,
    raw_payload TEXT NOT NULL, -- The "Dumb" Scrape result (HTML/JSON)
    source_platform TEXT NOT NULL, -- e.g., 'Upwork', 'OnlineJobs', 'Jobicy'
    
    -- State Machine
    status TEXT NOT NULL DEFAULT 'RAW' CHECK (status IN ('RAW', 'PROCESSING', 'PROCESSED', 'FAILED', 'PLATED')),
    triage_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (triage_status IN ('PENDING', 'PASSED', 'REJECTED')),
    locked_by TEXT, -- To prevent Inngest/Trigger collisions (e.g., 'inngest-chef-01')
    
    -- Audit & Purge
    error_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance Indices
-- Index for picking up RAW jobs efficiently
CREATE INDEX IF NOT EXISTS idx_raw_jobs_status_raw ON raw_job_harvests(status) WHERE status = 'RAW';
-- Index for the Plater to find PROCESSED jobs
CREATE INDEX IF NOT EXISTS idx_raw_jobs_status_processed ON raw_job_harvests(status) WHERE status = 'PROCESSED';
-- Index for the Janitor to purge old/plated records
CREATE INDEX IF NOT EXISTS idx_raw_jobs_purge ON raw_job_harvests(created_at, status);

-- 3. Automatic Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_raw_job_harvests_updated_at ON raw_job_harvests;
CREATE TRIGGER update_raw_job_harvests_updated_at
    BEFORE UPDATE ON raw_job_harvests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 4. Initial Health Check Row (Optional)
-- INSERT INTO raw_job_harvests (source_url, raw_payload, source_platform, status) 
-- VALUES ('https://example.com/health-check', '<h1>System Operational</h1>', 'Internal', 'RAW');
