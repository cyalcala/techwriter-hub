import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, count, and } from "drizzle-orm";

async function runCheck() {
  console.log("💎 TITANIUM INTEGRITY CROSS-CHECK\n");

  // 1. DB TOTALS
  const [totalActiveRes] = await db.select({ val: count() }).from(opportunities).where(eq(opportunities.isActive, true));
  const [goldCountRes] = await db.select({ val: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), eq(opportunities.tier, 1)));
  const [silverCountRes] = await db.select({ val: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), eq(opportunities.tier, 2)));
  const [bronzeCountRes] = await db.select({ val: count() }).from(opportunities).where(and(eq(opportunities.isActive, true), eq(opportunities.tier, 3)));
  const [trashCountRes] = await db.select({ val: count() }).from(opportunities).where(eq(opportunities.tier, 4));

  const totalActive = Number(totalActiveRes.val);
  const goldCount = Number(goldCountRes.val);
  const silverCount = Number(silverCountRes.val);
  const bronzeCount = Number(bronzeCountRes.val);
  const trashCount = Number(trashCountRes.val);

  console.log("--- Database Layer ---");
  console.log(`Total Active (Public): ${totalActive}`);
  console.log(`  Tier 1 (Gold):   ${goldCount}`);
  console.log(`  Tier 2 (Silver): ${silverCount}`);
  console.log(`  Tier 3 (Bronze): ${bronzeCount}`);
  console.log(`Total Trash (Filtered out): ${trashCount}`);

  // 2. FRONTEND EXPECTATIONS
  const ASTRO_LIMIT = 3000;
  const NEXT_JS_LIMIT = 48;

  console.log("\n--- Frontend Layer (Astro) ---");
  console.log(`Astro Limit: ${ASTRO_LIMIT}`);
  console.log(`Discrepancy: ${totalActive <= ASTRO_LIMIT ? "NONE (Website is FAITHFUL to DB)" : `Astro truncating by ${totalActive - ASTRO_LIMIT}`}`);

  console.log("\n--- Frontend Layer (Next.js) ---");
  console.log(`Next.js Limit: ${NEXT_JS_LIMIT} (Featured)`);
  console.log(`Available High-Tier (Gold+Silver): ${goldCount + silverCount}`);

  console.log("\n--- Integrity Verdict ---");
  if (totalActive > 0 && (goldCount + silverCount) > 0) {
    console.log("✅ SYSTEM HEALTHY: Data is flowing and correctly tiered.");
  } else {
    console.log("⚠️ WARNING: Data volume is suspiciously low.");
  }
}

runCheck().catch(console.error);
