import postgres from "postgres";
import { db } from "../packages/db/client";
import { opportunities, logs } from "../packages/db/schema";
import { v4 as uuidv4 } from "uuid";

async function restore() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error("SUPABASE_DB_URL missing");

  console.log("☢️  INITIATING NUCLEAR SYNC RESTORE FROM SUPABASE...");

  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    // 1. Fetch ALL plated jobs
    console.log("-> 1. Pulling all PLATED signals from Supabase...");
    const jobs = await sql`
      SELECT id, mapped_payload 
      FROM raw_job_harvests 
      WHERE status = 'PLATED' 
      AND mapped_payload IS NOT NULL
      ORDER BY created_at DESC
    `;

    console.log(`   [!] Found ${jobs.length} signals in the Source of Truth.`);

    // 2. Format and Upsert into Turso
    console.log("-> 2. Hydrating Gold Vault...");
    let successCount = 0;
    const chunk = 50;

    for (let i = 0; i < jobs.length; i += chunk) {
      const batch = jobs.slice(i, i + chunk);
      const values = batch.map(j => {
        const payload = j.mapped_payload;
        // Hygiene and Date Hydration
        return {
          ...payload,
          id: payload.id || uuidv4(),
          scrapedAt: new Date(payload.scrapedAt || Date.now()),
          postedAt: payload.postedAt ? new Date(payload.postedAt) : null,
          createdAt: new Date(payload.createdAt || Date.now()),
          latestActivityMs: payload.latestActivityMs || Date.now(),
          isActive: true
        };
      });

      await db.insert(opportunities)
        .values(values)
        .onConflictDoUpdate({
          target: opportunities.md5_hash,
          set: {
            latestActivityMs: sql.raw('excluded.latest_activity_ms'),
            isActive: true
          }
        });
      
      successCount += batch.length;
      if (i % 250 === 0) console.log(`   ...Progress: ${successCount}/${jobs.length}`);
    }

    console.log(`   [✓] Successfully re-hydrated ${successCount} signals.`);

    // 3. Log the event
    await db.insert(logs).values({
      id: uuidv4(),
      message: `NUCLEAR SYNC: Restored ${successCount} signals from Supabase Source of Truth.`,
      level: "snapshot",
      timestamp: new Date()
    });

    console.log("\n✅ GOLD VAULT RESTORED. System is back in sync.");
  } catch (err) {
    console.error("\n❌ RESTORE FAILED:", err);
  } finally {
    await sql.end();
  }
}

restore().catch(console.error);
