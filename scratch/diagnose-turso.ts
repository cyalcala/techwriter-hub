import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, desc } from "drizzle-orm";

async function diagnose() {
  console.log("🔍 [DIAGNOSE] Analyzing Turso Vault Status...");

  const count = await db.run(sql`SELECT count(*) as total FROM opportunities`);
  console.log(`📊 Total Opportunities: ${count.rows[0].total}`);

  const sample = await db.select().from(opportunities).orderBy(desc(opportunities.createdAt)).limit(5);
  console.log("\n📀 Latest 5 Jobs in Turso:");
  sample.forEach(s => {
    console.log(`- [${s.scrapedAt}] ${s.title} (${s.company}) [Hash: ${s.md5_hash}]`);
  });

  const recoverySource = await db.run(sql`SELECT count(*) as total FROM opportunities WHERE source_platform LIKE '%Recovery%'`);
  console.log(`\n🩺 Recovered Jobs in Turso: ${recoverySource.rows[0].total}`);

  process.exit(0);
}

diagnose();
