import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function syncV10Vault() {
  console.log("🛠️ V10 VAULT SYNCHRONIZER: FORCING SCHEMA ALIGNMENT...");

  try {
    // 1. Drop existing opportunities (Wipe & Start Fresh approved)
    console.log("- Dropping legacy 'opportunities' table...");
    await client.execute(`DROP TABLE IF EXISTS opportunities;`);
    console.log("  ✅ Table 'opportunities' dropped.");

    // 2. Create V10 Opportunities
    console.log("- Recreating 'opportunities' with V10 Data Contract...");
    await client.execute(`
      CREATE TABLE opportunities (
        id TEXT PRIMARY KEY NOT NULL,
        md5_hash TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        url TEXT NOT NULL,
        salary TEXT,
        description TEXT NOT NULL,
        niche TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'agency',
        source_platform TEXT DEFAULT 'Generic',
        tags TEXT NOT NULL DEFAULT '[]',
        location_type TEXT NOT NULL DEFAULT 'remote',
        posted_at INTEGER,
        scraped_at INTEGER NOT NULL,
        last_seen_at INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        tier INTEGER NOT NULL DEFAULT 3,
        relevance_score INTEGER NOT NULL DEFAULT 0,
        latest_activity_ms INTEGER NOT NULL DEFAULT 0,
        company_logo TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL
      );
    `);
    console.log("  ✅ Table 'opportunities' created.");

    // 3. Create Indices
    console.log("- Generating V10 High-Performance Indices...");
    await client.execute(`CREATE INDEX IF NOT EXISTS niche_idx ON opportunities (niche);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS md5_idx ON opportunities (md5_hash);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS tier_latest_idx ON opportunities (tier, latest_activity_ms);`);
    console.log("  ✅ Indices locked.");

    console.log("\n🚀 [SYSTEM SECURED] V10 Vault Synchronized. Turso is now perfectly aligned with the Glass.");
  } catch (err: any) {
    console.error("\n❌ VAULT SYNC FAILED:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

syncV10Vault();
