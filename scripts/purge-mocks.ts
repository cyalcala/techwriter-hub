import { client } from "../packages/db/client";

/**
 * 🗑️ MOCK DATA PURGE v1.0
 * 
 * Goal: Wipe all test data (Omega Mock Agency, V12 Fallback, etc.)
 * from the Turso Gold Vault to ensure ONLY real jobs are shown.
 */

async function purge() {
  console.log("🗑️ [PURGE] Starting Mock Data Cleanup in Turso...");

  try {
    const result = await client.execute({
        sql: "DELETE FROM opportunities WHERE company LIKE '%Mock%' OR source_platform LIKE '%Fallback%' OR title LIKE '%Test%'"
    });
    console.log(`✅ Successfully purged ${result.rowsAffected} mock records from the vault.`);

    // Final count check
    const countCheck = await client.execute("SELECT count(*) as total FROM opportunities");
    console.log(`📊 Remaining (Real) Opportunities: ${countCheck.rows[0].total}`);

  } catch (err: any) {
    console.error("🔴 [PURGE] FAILED during cleanup:", err.message);
  }
}

purge();
