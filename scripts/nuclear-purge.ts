import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

async function nuclearReset() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ Missing Turso credentials in .env");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log("🧨 [NUCLEAR_RESET] Targeting stale and mock data in Turso Vault...");

  try {
    // 1. Audit before deletion
    const auditBefore = await client.execute("SELECT count(*) as count FROM opportunities");
    console.log(`📊 Current Row Count: ${auditBefore.rows[0].count}`);

    // 2. The Purge
    // We keep jobs that:
    // - Are from V12 sources
    // - Are NOT mocks/simulations
    // - Are recent (scraped after 2026-04-06)
    const purgeQuery = `
      DELETE FROM opportunities 
      WHERE 
        (
          source_platform NOT LIKE 'Trigger Sifter%' 
          AND source_platform NOT LIKE 'V12 Mesh%'
        )
        OR (title LIKE '%Mock%' OR company LIKE '%Simulation%' OR title LIKE '%Test%' OR company LIKE '%Test%')
        OR (scraped_at < strftime('%s', '2026-04-06 00:00:00') * 1000)
    `;

    const result = await client.execute(purgeQuery);
    console.log(`✅ [PURGE_COMPLETE] Removed ${result.rowsAffected} stale/mock rows.`);

    // 3. Audit after deletion
    const auditAfter = await client.execute("SELECT count(*) as count FROM opportunities");
    console.log(`📊 Post-Purge Row Count: ${auditAfter.rows[0].count}`);

  } catch (err: any) {
    console.error("❌ [NUCLEAR_RESET_FAILED]:", err.message);
  } finally {
    client.close();
  }
}

nuclearReset();
