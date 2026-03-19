import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, desc, limit } from "drizzle-orm";

async function inspectTrash() {
  console.log("🔍 INSPECTING RECENT TRASH (TIER 4)\n");
  
  const trashItems = await db.select()
    .from(opportunities)
    .where(eq(opportunities.tier, 4))
    .orderBy(desc(opportunities.scrapedAt))
    .limit(10);

  for (const item of trashItems) {
    console.log(`[TRASH] Title: ${item.title}`);
    console.log(`        Comp:  ${item.company}`);
    // console.log(`        Desc:  ${item.description?.slice(0, 100)}...`);
    console.log("---");
  }
}

inspectTrash().catch(console.error);
