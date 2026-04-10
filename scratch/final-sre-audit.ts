import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { count, sql } from "drizzle-orm";

async function finalAudit() {
  const [total] = await db.select({ value: count() }).from(opportunities);
  const niches = await db.select({ 
    niche: opportunities.niche, 
    value: count() 
  }).from(opportunities).groupBy(opportunities.niche);

  console.log("📊 [FINAL AUDIT]");
  console.log(`   Total Jobs: ${total.value}`);
  console.log(`   Distribution:`);
  niches.forEach(n => {
    console.log(`    - ${n.niche}: ${n.value}`);
  });
  
  process.exit(0);
}

finalAudit().catch(console.error);
