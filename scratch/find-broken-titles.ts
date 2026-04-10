import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.select({ 
    id: opportunities.id, 
    title: opportunities.title,
    company: opportunities.company,
    sourcePlatform: opportunities.sourcePlatform
  }).from(opportunities);

  console.log(`Total jobs scanned: ${res.length}`);
  
  const broken = res.filter(j => j.title.includes('<') || j.title.includes('html') || j.title.length > 100);
  
  console.log(`Broken jobs found: ${broken.length}`);
  broken.slice(0, 10).forEach(j => {
    console.log(`- [${j.id}] Source: ${j.sourcePlatform} | Title: ${j.title.substring(0, 50)}...`);
  });

  process.exit(0);
}

run();
