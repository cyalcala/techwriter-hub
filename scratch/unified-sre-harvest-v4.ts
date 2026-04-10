import { db } from "../packages/db/client";
import { opportunities as opportunitiesSchema } from "../packages/db/schema";
import { goldmineSources, fetchGoldmineJobs } from "../jobs/lib/ph-goldmines";
import { mapTitleToDomain } from "../packages/db/taxonomy";
import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../packages/db";
import { OpportunitySchema } from "../packages/db/validation";
import crypto from "crypto";

async function unifiedSreHarvestV4() {
  console.log("🦾 [SRE] Initiating Unified Harvest V4 (Primary Key Fix)...");
  
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
          id: uuidv4(), // 🛡️ Primary Key
          md5_hash,
          title: signal.title,
          company: signal.company,
          url: signal.sourceUrl,
          type: "direct",
          sourcePlatform: source.name,
          tags: JSON.stringify(["SRE_BACKFILL", "PH_GOLDMINE", source.name]),
          locationType: "remote",
          description: signal.description || `High-intent opportunity from ${source.name}. Click to view details.`,
          postedAt: new Date(),
          scrapedAt: new Date(),
          lastSeenAt: new Date(),
          isActive: true,
          tier: 1, 
          relevanceScore: 95, 
          latestActivityMs: Date.now(),
          niche: niche,
          region: "Philippines",
          metadata: JSON.stringify({ source: source.name, harvested_at: new Date().toISOString() })
        };

        const validation = OpportunitySchema.safeParse(payload);

        if (validation.success) {
          results.push(validation.data);
        } else {
            console.warn(`      ⚠️ Validation failed for ${signal.title}:`, validation.error.message);
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
      // 🔱 TITANIUM ATOMIC INJECTION
      await db.insert(opportunitiesSchema)
        .values({
            id: job.id!, 
            md5_hash: job.md5_hash,
            title: job.title,
            company: job.company,
            url: job.url,
            description: job.description,
            niche: job.niche,
            type: job.type as any,
            sourcePlatform: job.sourcePlatform,
            tags: job.tags,
            locationType: job.locationType,
            postedAt: job.postedAt,
            scrapedAt: job.scrapedAt,
            lastSeenAt: job.lastSeenAt,
            isActive: job.isActive,
            tier: job.tier,
            relevanceScore: job.relevanceScore,
            latestActivityMs: job.latestActivityMs,
            region: "Philippines",
            metadata: job.metadata
        })
        .onConflictDoUpdate({
          target: [opportunitiesSchema.md5_hash],
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
  
  // FINAL HEARTBEAT PULSE
  const now = Date.now();
  await db.update(opportunitiesSchema).set({ latestActivityMs: now });
  console.log("🚥 [SRE] Global Clock Synchronized.");
  
  process.exit(0);
}

unifiedSreHarvestV4().catch(console.error);
