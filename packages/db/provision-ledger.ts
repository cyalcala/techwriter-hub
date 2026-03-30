import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ESM __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure we load the environment variables from the root
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function surgicalFix() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("🛑 Environment variables TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing.");
    return;
  }

  const client = createClient({ url, authToken });

  console.log("══ Initiating Surgical Schema Alignment ══");

  try {
    // 1. Provision NotesLog Table
    console.log("[fix] Checking for 'noteslog' table...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS noteslog (
        id TEXT PRIMARY KEY NOT NULL,
        timestamp INTEGER NOT NULL,
        drift_minutes INTEGER NOT NULL,
        actions_taken TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata TEXT DEFAULT '{}'
      );
    `);
    console.log("[fix] ✅ 'noteslog' table is ready.");

    // 2. Synchronize ExtractionRules (from Migration 0007)
    console.log("[fix] Synchronizing 'extraction_rules' columns...");
    const rulesTable = await client.execute("PRAGMA table_info(extraction_rules)");
    const columnNames = rulesTable.rows.map(r => r.name);

    if (!columnNames.includes("failure_reason")) {
        await client.execute("ALTER TABLE extraction_rules ADD COLUMN failure_reason TEXT;");
        console.log("[fix] Added Column: failure_reason");
    } else {
        console.log("[fix] Column 'failure_reason' already exists.");
    }

    if (!columnNames.includes("last_error_log")) {
        await client.execute("ALTER TABLE extraction_rules ADD COLUMN last_error_log TEXT;");
        console.log("[fix] Added Column: last_error_log");
    } else {
        console.log("[fix] Column 'last_error_log' already exists.");
    }

    // 3. Genesis Entry
    console.log("[fix] Writing GENESIS entry to Silent Ledger...");
    await client.execute({
      sql: "INSERT INTO noteslog (id, timestamp, drift_minutes, actions_taken, status, metadata) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        uuidv4(),
        Date.now(),
        0,
        "TITANIUM_SCHEMA_ALIGNMENT_COMPLETE",
        "success",
        JSON.stringify({
          source: "provision-ledger.ts",
          timestamp: new Date().toISOString(),
          details: "Desynchronized migration log resolved surgically."
        })
      ]
    });
    console.log("[fix] ✅ Genesis entry committed.");

    console.log("══ Surgical Alignment Successful ══");
  } catch (err: any) {
    console.error("🛑 Surgical Fix Failed:", err.message);
  } finally {
    client.close();
  }
}

surgicalFix();
