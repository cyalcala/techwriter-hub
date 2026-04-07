import { db } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { sql } from "drizzle-orm";

async function check() {
  const result = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    sourcePlatform: opportunities.sourcePlatform,
    scrapedAt: opportunities.scrapedAt,
    tier: opportunities.tier
  }).from(opportunities).limit(20);
  
  console.log(JSON.stringify(result, null, 2));
}

check().catch(console.error);
