import { client } from "../packages/db/client";

/**
 * 🛠️ TURSO GOLD VAULT MIGRATION (V12 ALIGNED)
 * 
 * Goal: Add V12 Governance columns to the 'vitals' table in Turso.
 * Ensuring the 'LIT' status handshake and circuit breaker are functional.
 */

async function migrate() {
  console.log("🛠️ [TURSO-MIGRATION] Probing Gold Vault schema...");

  try {
    // 1. Add governance columns (Wait for sqlite-friendly ALTER)
    // In LibSQL/Turso, we wrap in try-catch to avoid 'duplicate column' errors
    try {
      await client.execute("ALTER TABLE vitals ADD COLUMN trigger_credits_ok INTEGER DEFAULT 1");
      console.log("✅ Column 'trigger_credits_ok' added.");
    } catch (e: any) {
      if (e.message.includes("duplicate column")) {
        console.log("ℹ️ Column 'trigger_credits_ok' already exists.");
      } else {
        throw e;
      }
    }

    try {
      await client.execute("ALTER TABLE vitals ADD COLUMN trigger_last_exhaustion TEXT");
      console.log("✅ Column 'trigger_last_exhaustion' added.");
    } catch (e: any) {
      if (e.message.includes("duplicate column")) {
        console.log("ℹ️ Column 'trigger_last_exhaustion' already exists.");
      } else {
        throw e;
      }
    }

    // 2. Ensure a seed record exists in 'vitals'
    const check = await client.execute("SELECT count(*) as count FROM vitals");
    if (Number(check.rows[0].count) === 0) {
      console.log("🌱 Seeding initial vitals record...");
      await client.execute({
        sql: "INSERT INTO vitals (id, system_status, trigger_credits_ok) VALUES (?, ?, ?)",
        args: [crypto.randomUUID(), 'LIT', 1]
      });
    }

    console.log("🎉 [TURSO-MIGRATION] Gold Vault is now V12 compliant.");

  } catch (err: any) {
    console.error("🔴 [TURSO-MIGRATION] FAILED:", err.message);
  }
}

migrate();
