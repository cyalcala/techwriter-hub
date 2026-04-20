const TABLES = [
  `CREATE TABLE IF NOT EXISTS agencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    website_url TEXT,
    hiring_url TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    last_sync INTEGER NOT NULL,
    last_seen_at INTEGER,
    verified_at INTEGER,
    metadata TEXT,
    score INTEGER,
    buzz_score INTEGER DEFAULT 0,
    hiring_heat INTEGER DEFAULT 1,
    friction_level INTEGER DEFAULT 3,
    created_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    md5_hash TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    url TEXT NOT NULL,
    salary TEXT,
    description TEXT NOT NULL,
    niche TEXT NOT NULL,
    type TEXT DEFAULT 'agency' NOT NULL,
    source_platform TEXT DEFAULT 'Generic',
    tags TEXT DEFAULT '[]' NOT NULL,
    location_type TEXT DEFAULT 'remote' NOT NULL,
    posted_at INTEGER,
    scraped_at INTEGER NOT NULL,
    last_seen_at INTEGER,
    is_active INTEGER DEFAULT 1 NOT NULL,
    tier INTEGER DEFAULT 3 NOT NULL,
    relevance_score INTEGER DEFAULT 0 NOT NULL,
    latest_activity_ms INTEGER DEFAULT 0 NOT NULL,
    region TEXT DEFAULT 'Philippines' NOT NULL,
    company_logo TEXT,
    metadata TEXT DEFAULT '{}' NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS vitals (
    id TEXT PRIMARY KEY,
    ai_quota_count INTEGER DEFAULT 0,
    ai_quota_date TEXT,
    lock_status TEXT DEFAULT 'IDLE',
    lock_updated_at INTEGER,
    successive_failure_count INTEGER DEFAULT 0,
    last_error_hash TEXT,
    last_recovery_at INTEGER,
    trigger_credits_ok INTEGER DEFAULT 1,
    trigger_last_exhaustion INTEGER,
    region TEXT DEFAULT 'GLOBAL',
    last_ingestion_heartbeat_ms INTEGER,
    last_processing_heartbeat_ms INTEGER,
    heartbeat_source TEXT,
    last_harvest_at INTEGER,
    last_harvest_engine TEXT,
    last_intervention_at INTEGER,
    last_intervention_reason TEXT,
    sentinel_state TEXT,
    total_purged INTEGER DEFAULT 0,
    geo_kills INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 100
  );`
];

async function start() {
  const { execSync } = await import('child_process');
  for (const sql of TABLES) {
    try {
      console.log(`🛠️ Creating table: ${sql.split('(')[0].trim()}`);
      execSync(`npx wrangler d1 execute techwriter-db --command "${sql.replace(/"/g, '\\"')}" --remote`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`❌ Failed to create table:`, e);
    }
  }
  console.log("✅ D1 Schema Initialized.");
}

start();
