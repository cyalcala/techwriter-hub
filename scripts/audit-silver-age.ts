import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, desc, and } from "drizzle-orm";

async function checkOldSilver() {
  console.log("🔍 AUDITING SILVER (TIER 2) RADIUS\n");
  
  const now = Math.floor(Date.now() / 1000);
  const sixHoursAgo = now - (6 * 3600);
  const twentyFourHoursAgo = now - (24 * 3600);

  const [totalSilver] = await db.select({ val: db.$count(opportunities, eq(opportunities.tier, 2)) });
  const [freshSilver] = await db.select({ val: db.$count(opportunities, and(eq(opportunities.tier, 2), db.gt(opportunities.scrapedAt, twentyFourHoursAgo))) });

  console.log(`Total Silver: ${totalSilver.val}`);
  console.log(`Silver < 24h: ${freshSilver.val}`);
  console.log(`Stale Silver: ${totalSilver.val - freshSilver.val}`);
}

checkOldSilver().catch(console.error);
