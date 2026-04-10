import { db } from "../packages/db/client";
import { opportunities as opportunitiesSchema } from "../packages/db/schema";
import { goldmineSources, fetchGoldmineJobs } from "../jobs/lib/ph-goldmines";
import { mapTitleToDomain } from "../packages/db/taxonomy";
import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../packages/db";
import { OpportunitySchema } from "../packages/db/validation";
import crypto from "crypto";

async function unifiedSreHarvestRepaired() {
  console.log("🦾 [SRE] Initiating Repaired Unified Harvest & Plate (Direct Injection)...");
  
  const results = [];
  
  for (const source of goldmineSources) {
    try {
      console.log(`   -> Harvesting ${source.name}...`);
      const signals = await fetchGoldmineJobs(source.name);
      
      for (const signal of signals) {
        const niche = mapTitleToDomain(signal.title, signal.description || "");
        
        // 🧪 Generate MD5 Hash (The Idempotency Shield)
        const hashBase = `${signal.title}|${signal.company}`.toLowerCase().trim();
        const md5_hash = crypto.createHash('md5').update(hashBase).digest('hex');

        const payload = {
          md5_hash,
          title: signal.title,
          company: signal.company,
          url: signal.sourceUrl, // Renamed from sourceUrl to url
          type: "direct",
          sourcePlatform: source.name,
          tags: ["SRE_BACKFILL", "PH_GOLDMINE"],
          locationType: "remote",
          description: signal.description || `High-intent opportunity from ${source.name}. Click to view details.`,
          postedAt: normalizeDate(new Date()),
          scrapedAt: new Date(),
          lastSeenAt: new Date(),
          isActive: true,
          tier: 1, 
          relevanceScore: 90, 
          latestActivityMs: Date.now(),
          niche: niche
        };

        const validation = OpportunitySchema.safeParse(payload);

        if (validation.success) {
          results.push(validation.data);
        } else {
            // console.warn(`      ⚠️ Validation failed for ${signal.title}:`, validation.error.format());
        }
      }
    } catch (err: any) {
      console.error(`🚫 Source Failure [${source.name}]:`, err.message);
    }
  }

  console.log(`🚀 [SRE] Injecting ${results.length} validated signals into Turso Gold Vault...`);
  let injected = 0;
  
  for (const job of results) {
    try {
      await db.insert(opportunitiesSchema)
        .values(job as any)
        .onConflictDoUpdate({
          target: [opportunitiesSchema.md5_hash], // Match on hash for V12 compatibility
          set: { 
            lastSeenAt: new Date(), 
            isActive: true,
            latestActivityMs: Date.now(),
            niche: job.niche 
          }
        });
      injected++;
    } catch (err: any) {
       console.error(`      ❌ Injection failed for ${job.title}:`, err.message);
    }
  }

  console.log(`✅ [SRE] Injection Complete. ${injected} signals live. Directory lanes filled.`);
  process.exit(0);
}

unifiedSreHarvestRepaired().catch(console.error);
