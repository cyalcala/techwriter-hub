import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { siftOpportunity } from "@va-hub/core/sieve";
import { eq } from "drizzle-orm";

async function reSiftAll() {
  console.log("💎 TITANIUM RE-SIFT: RECOVERING BRONZE DENSITY\n");
  
  const allOpps = await db.select().from(opportunities);
  let updatedCount = 0;
  let bronzeAdded = 0;

  for (const opp of allOpps) {
    const result = siftOpportunity(opp.title, opp.description || "", opp.company || "Generic", opp.sourcePlatform || "Generic");
    
    if (result.tier !== opp.tier) {
      await db.update(opportunities)
        .set({ 
          tier: result.tier, 
          isActive: result.tier !== 4,
          relevanceScore: result.relevanceScore,
          displayTags: JSON.stringify(result.displayTags)
        })
        .where(eq(opportunities.id, opp.id));
      
      updatedCount++;
      if (result.tier === 3) bronzeAdded++;
    }
  }

  console.log(`Update Complete!`);
  console.log(`Total Updated: ${updatedCount}`);
  console.log(`Bronze Tier Recovered: ${bronzeAdded} items`);
}

reSiftAll().catch(console.error);
