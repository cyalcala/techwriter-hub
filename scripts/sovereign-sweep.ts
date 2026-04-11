/**
 * V12 SOVEREIGN SWEEP: The Database Purge
 * Focus: Identify and Archive Non-PH-Friendly or Stale jobs erroneously kept active.
 */

import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq, and, not, lt, or } from "drizzle-orm";
import { siftOpportunity, OpportunityTier } from "../src/core/sieve";

async function runSweep() {
  console.log("🧹 [SOVEREIGN SWEEP] Initializing database purge...");

  // 1. Fetch All Active Jobs
  const activeJobs = await db.select().from(opportunities).where(eq(opportunities.isActive, true));
  console.log(`🧹 [SOVEREIGN SWEEP] Auditing ${activeJobs.length} active signals.`);

  let purgedCount = 0;
  let archivedCount = 0;

  for (const job of activeJobs) {
    // A. STALENESS CHECK (Absolute expiry: 10 days)
    const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
    const discoveryTime = job.scrapedAt ? new Date(job.scrapedAt).getTime() : 0;

    if (discoveryTime < tenDaysAgo) {
      await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, job.id));
      archivedCount++;
      continue;
    }

    // B. PHOSPHORUS SHIELD RE-EVALUATION
    const reSift = siftOpportunity(
      job.title || "",
      job.description || "",
      job.company || "Generic",
      job.sourcePlatform || "Unknown"
    );

    if (reSift.tier === OpportunityTier.TRASH || !reSift.isPhCompatible) {
      console.log(`🚫 [PURGE] Removing: ${job.title} (${job.company}) - REASON: PH-Incompatible / Trash Tier`);
      await db.update(opportunities)
        .set({ 
            isActive: false, 
            tier: OpportunityTier.TRASH,
            metadata: JSON.stringify({ 
                ...(typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata),
                purged_by: "sovereign-sweep-v12",
                purge_reason: !reSift.isPhCompatible ? "geo_incompatible" : "quality_trash"
            })
        })
        .where(eq(opportunities.id, job.id));
      purgedCount++;
    }
  }

  console.log("✅ [SOVEREIGN SWEEP] COMPLETED.");
  console.log(`📊 ARCHIVED (Stale): ${archivedCount}`);
  console.log(`📊 PURGED (Low Quality): ${purgedCount}`);
}

runSweep().catch(console.error);
