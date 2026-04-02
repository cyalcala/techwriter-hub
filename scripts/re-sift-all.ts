import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { siftOpportunity } from "@va-hub/core/sieve";
import { eq, sql } from "drizzle-orm";

async function reSiftAll() {
  console.log("🛠️ INITIATING GLOBAL RE-SIFT (TITANIUM PURITY)...");
  
  const allOpps = await db.select().from(opportunities);
  console.log(`Processing ${allOpps.length} records...`);

  let updated = 0;
  for (const opp of allOpps) {
    const result = siftOpportunity(
      opp.title,
      opp.description || "",
      opp.company || "Generic",
      opp.sourcePlatform || "Generic"
    );

    if (result.tier !== opp.tier) {
      await db.update(opportunities)
        .set({ 
          tier: result.tier,
          isActive: result.tier !== 4,
          relevanceScore: result.relevanceScore,
          displayTags: JSON.stringify(result.displayTags)
        })
        .where(eq(opportunities.id, opp.id));
      updated++;
    } else {
      // Even if tier is same, ensure isActive is correct
      const shouldBeActive = result.tier !== 4;
      if (opp.isActive !== shouldBeActive) {
        await db.update(opportunities)
          .set({ isActive: shouldBeActive })
          .where(eq(opportunities.id, opp.id));
        updated++;
      }
    }
  }

  console.log(`✅ Re-Sift Complete: ${updated} records updated.`);
}

reSiftAll().catch(console.error);
