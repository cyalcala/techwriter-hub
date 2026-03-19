import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, not, asc, desc } from "drizzle-orm";

async function checkSequence() {
  const opps = await db.select()
    .from(opportunities)
    .where(not(eq(opportunities.tier, 4)))
    .orderBy(asc(opportunities.tier), desc(opportunities.scrapedAt))
    .limit(3000);

  console.log(`Total Active Found: ${opps.length}`);
  
  const microIndex = opps.findIndex(o => o.company?.toLowerCase().includes("micro1"));
  if (microIndex !== -1) {
    console.log(`'micro1' found at index: ${microIndex}`);
    console.log(`Item at index ${microIndex}: ${opps[microIndex].title} @ ${opps[microIndex].company}`);
    
    console.log("\nNext 5 items after micro1:");
    for (let i = 1; i <= 5; i++) {
      const next = opps[microIndex + i];
      if (next) console.log(`${microIndex + i}: ${next.title} @ ${next.company}`);
    }
  } else {
    console.log("'micro1' NOT found in the first 3000 items.");
  }
}

checkSequence().catch(console.error);
