import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, like, or, eq, desc, and } from "drizzle-orm";

async function nuclearClean() {
  console.log("🧹 [SRE] Initiating Nuclear Cleanup...");

  // 1. Purge HTML Pollution
  const htmlResult = await db.delete(opportunities).where(
    or(
      like(opportunities.title, "%<%"),
      like(opportunities.title, "%<!DOCTYPE%"),
      like(opportunities.title, "%html%"),
      sql`length(title) > 200`
    )
  );
  console.log(`✅ Purged ${htmlResult.rowsAffected} jobs with HTML/Broken titles.`);

  // 2. Global Deduplication
  // Keep the most recent job for each (Title, Company)
  console.log("🧬 Identifying duplicates by (Title, Company)...");
  
  const allJobs = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    company: opportunities.company,
    latestActivityMs: opportunities.latestActivityMs
  }).from(opportunities).orderBy(desc(opportunities.latestActivityMs));

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const job of allJobs) {
    const key = `${job.title}::${job.company}`.toLowerCase().trim();
    if (seen.has(key)) {
      toDelete.push(job.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    console.log(`🗑️ Deleting ${toDelete.length} duplicate signals...`);
    // Delete in chunks of 50 to avoid SQL limits
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      await db.delete(opportunities).where(sql`id IN (${sql.join(chunk.map(id => sql`${id}`), sql`, `)})`);
    }
  }

  console.log("✅ Deduplication complete.");
  process.exit(0);
}

nuclearClean().catch(console.error);
