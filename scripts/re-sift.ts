import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { siftOpportunity } from "../jobs/lib/sifter";
import { eq } from "drizzle-orm";

async function reSiftAll() {
  console.log("💎 TITANIUM RE-SIFT: RECOVERING BRONZE DENSITY\n");
  
  const allOpps = await db.select().from(opportunities);
  let updatedCount = 0;
  let bronzeAdded = 0;

  for (const opp of allOpps) {
    const newTier = siftOpportunity(opp.title, opp.company, opp.description || "", opp.sourcePlatform || "");
    
    if (newTier !== opp.tier) {
      await db.update(opportunities)
        .set({ tier: newTier, isActive: newTier !== 4 })
        .where(eq(opportunities.id, opp.id));
      
      updatedCount++;
      if (newTier === 3) bronzeAdded++;
    }
  }

  console.log(`Update Complete!`);
  console.log(`Total Updated: ${updatedCount}`);
  console.log(`Bronze Tier Recovered: ${bronzeAdded} items`);
}

reSiftAll().catch(console.error);
