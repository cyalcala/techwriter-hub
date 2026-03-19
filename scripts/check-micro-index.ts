import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, desc } from "drizzle-orm";

async function checkIndex() {
  const res = await db.select()
    .from(opportunities)
    .where(eq(opportunities.isActive, true))
    .orderBy(desc(opportunities.scrapedAt))
    .limit(1000);
    
  const mIdx = res.findIndex(o => (o.title || "").toLowerCase().includes("micro1"));
  console.log(`\n📊 NEXT.JS (DESC SCRAPED_AT) AUDIT:`);
  console.log(`Total Active: ${res.length}`);
  console.log(`'micro1' Index: ${mIdx}`);
  if (mIdx !== -1) {
    console.log(`Is it at the very bottom of a 100-item list? ${mIdx === 99 ? "YES (LEGACY LIMIT DETECTED)" : "NO"}`);
    console.log(`Is it at the very bottom of a 48-item list? ${mIdx === 47 ? "YES (LEGACY HOME LIMIT DETECTED)" : "NO"}`);
  }
}

checkIndex().catch(console.error);
