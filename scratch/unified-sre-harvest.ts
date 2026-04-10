import { db } from "../packages/db/client";
import { opportunities as opportunitiesSchema } from "../packages/db/schema";
import { goldmineSources, fetchGoldmineJobs } from "../jobs/lib/ph-goldmines";
import { mapTitleToDomain } from "../packages/db/taxonomy";
import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../packages/db";
import { OpportunitySchema } from "../packages/db/validation";

async function unifiedSreHarvest() {
  console.log("🦾 [SRE] Initiating Unified Harvest & Plate (Direct Injection)...");
  
  const results = [];
  
  // 1. COLLECT FROM GOLDMINES (Reddit + Agencies)
  for (const source of goldmineSources) {
    try {
      console.log(`   -> Harvesting ${source.name}...`);
      const signals = await fetchGoldmineJobs(source.name);
      console.log(`      Found ${signals.length} signals.`);
      
      for (const signal of signals) {
        const niche = mapTitleToDomain(signal.title, signal.description || "");
        
        const validation = OpportunitySchema.safeParse({
          id: uuidv4(),
          title: signal.title,
          company: signal.company,
          type: "direct",
          sourceUrl: signal.sourceUrl,
          sourcePlatform: source.name,
          tags: ["SRE_BACKFILL", "PH_GOLDMINE"],
          locationType: "remote",
          description: signal.description || null,
          postedAt: normalizeDate(new Date()),
          scrapedAt: normalizeDate(new Date()),
          lastSeenAt: normalizeDate(new Date()),
          isActive: true,
          tier: 1, 
          relevanceScore: 90, 
          displayTags: ["PH-DIRECT", "GOLD-STANDARD"],
          latestActivityMs: Date.now(),
          niche: niche,
          region: "Philippines"
        });

        if (validation.success) {
          results.push(validation.data);
        }
      }
    } catch (err: any) {
      console.error(`🚫 Source Failure [${source.name}]:`, err.message);
    }
  }

  // 2. DIRECT INJECTION
  console.log(`🚀 [SRE] Injecting ${results.length} high-fidelity signals into Turso Gold Vault...`);
  let injected = 0;
  
  for (const job of results) {
    try {
      await db.insert(opportunitiesSchema)
        .values(job as any)
        .onConflictDoUpdate({
          target: [opportunitiesSchema.title, opportunitiesSchema.company],
          set: { 
            lastSeenAt: normalizeDate(new Date()), 
            isActive: true,
            latestActivityMs: Date.now(),
            niche: job.niche // Restore correct niche mapping
          }
        });
      injected++;
    } catch (err: any) {
      // Small failures OK
    }
  }

  console.log(`✅ [SRE] Injection Complete. ${injected} signals live. Directory lanes filled.`);
  process.exit(0);
}

unifiedSreHarvest().catch(console.error);
