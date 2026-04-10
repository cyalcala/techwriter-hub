import { db } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function addColumn(name: string, type: string) {
  try {
    const q = `ALTER TABLE vitals ADD COLUMN ${name} ${type};`;
    await db.run(sql.raw(q));
    console.log(`✅ Added: ${name}`);
  } catch (e: any) {
    console.warn(`⚠️  '${name}' already exists (OK)`);
  }
}

async function main() {
  console.log("🛠️ [SRE] Full Schema Repair — All Sentinel Columns...\n");

  await addColumn("last_harvest_at", "INTEGER");
  await addColumn("last_harvest_engine", "TEXT");
  await addColumn("last_intervention_at", "INTEGER");
  await addColumn("last_intervention_reason", "TEXT");
  await addColumn("sentinel_state", "TEXT");

  console.log("\n🔍 Verification...");
  try {
    const result = await db.run(sql`SELECT id, last_intervention_at, sentinel_state FROM vitals LIMIT 1`);
    console.log("✅ Schema synced. Row count:", result.rows?.length ?? 0);
  } catch (e: any) {
    console.error("❌ Verification failed:", e.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Repair failed:", err);
  process.exit(1);
});
