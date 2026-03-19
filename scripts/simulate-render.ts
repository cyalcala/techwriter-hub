import { db } from "../packages/db/client";
import { opportunities as opportunitiesTable } from "../packages/db/schema";
import { desc, asc, not, eq } from 'drizzle-orm';

async function simulateAstroFeed() {
  console.log("🚀 SIMULATING ASTRO FEED LOGIC (Native Bun Env)...");
  
  const liveOpportunities = await db.select()
    .from(opportunitiesTable)
    .where(not(eq(opportunitiesTable.tier, 4)))
    .orderBy(asc(opportunitiesTable.tier), desc(opportunitiesTable.scrapedAt))
    .limit(3000);

  console.log(`Step 0: DB returned ${liveOpportunities.length} items (tier != 4).`);

  const scored = liveOpportunities.map(opp => ({
    ...opp,
    tier: opp.tier,
    freshnessScore: ((Date.now() - new Date(opp.scrapedAt).getTime()) / (1000 * 60 * 60)) < 1 ? 1000000 : 50000,
  })).sort((a, b) => {
    if (a.tier !== b.tier) return a.tier! - b.tier!;
    return b.freshnessScore - a.freshnessScore;
  });

  const seenFingerprints = new Set();
  const companyUsage = new Map();
  const finalFeed = [];

  for (const opp of scored) {
    const normTitle = (opp.title || '').toLowerCase().trim();
    const fingerprint = `${normTitle}|${opp.sourcePlatform}`;
    
    if (seenFingerprints.has(fingerprint)) continue;

    seenFingerprints.add(fingerprint);
    finalFeed.push(opp);

    if (finalFeed.length >= 3000) break;
  }

  console.log(`Step 1: Final Feed size after deduping: ${finalFeed.length}`);
  
  const microIndex = finalFeed.findIndex(o => 
    (o.title || "").toLowerCase().includes("micro1") || 
    (o.company || "").toLowerCase().includes("micro1")
  );

  if (microIndex !== -1) {
    console.log(`'micro1' found in Final Feed at index: ${microIndex}`);
    console.log(`Item: ${finalFeed[microIndex].title} @ ${finalFeed[microIndex].company}`);
    console.log(`Is it the last item? ${microIndex === finalFeed.length - 1 ? "YES" : "NO"}`);
    if (microIndex < finalFeed.length - 1) {
       console.log(`NEXT ITEM at ${microIndex + 1}: ${finalFeed[microIndex + 1].title}`);
       console.log(`Total items AFTER micro1: ${finalFeed.length - 1 - microIndex}`);
    } else {
       console.log("ALERT: micro1 IS THE ABSOLUTE LAST ITEM.");
    }
  } else {
    console.log("'micro1' NOT found in Final Feed.");
  }
}

simulateAstroFeed().catch(console.error);
