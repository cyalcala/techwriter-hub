import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function applySurgicalFix() {
  console.log("🛠️ Starting Surgical Schema Fix...");

  try {
    // 1. Create extraction_rules
    console.log("- Creating 'extraction_rules' table...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS extraction_rules (
        id TEXT PRIMARY KEY NOT NULL,
        source_name TEXT NOT NULL UNIQUE,
        jsonata_pattern TEXT NOT NULL,
        confidence_score INTEGER DEFAULT 0,
        sample_payload TEXT,
        last_validated_at INTEGER,
        created_at INTEGER
      );
    `);
    console.log("  ✅ Table 'extraction_rules' ready.");

    // 2. Add consecutive_failures to system_health
    console.log("- Patching 'system_health' table...");
    try {
      await client.execute('ALTER TABLE system_health ADD COLUMN consecutive_failures INTEGER DEFAULT 0;');
      console.log("  ✅ Column 'consecutive_failures' added.");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) {
        console.log("  ℹ️ Column 'consecutive_failures' already exists.");
      } else {
        throw e;
      }
    }

    console.log("🚀 Surgical Fix Applied Successfully. Ingestion should now be stable.");
  } catch (err: any) {
    console.error("❌ Surgical Fix Failed:", err.message);
  } finally {
    client.close();
  }
}

applySurgicalFix();
