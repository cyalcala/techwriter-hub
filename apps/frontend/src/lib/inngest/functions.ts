console.log("V12_FUNCTIONS_EVALUATING");
import { inngest } from "./client";
import { db } from "../../../../../packages/db"; // Root packages/db
import { opportunities } from "../../../../../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

import { runAIWaterfall } from "../ai/waterfall";
import { siftOpportunity } from "../../../../../src/core/sieve";

/**
 * ONE CHEF (Prep, Cook, Plate)
 * Triggered by: job.harvested event (The Hot Path)
 * Role: The ONLY action-engine allowed to plate meals to the Gold Vault.
 */
export const jobHarvested = inngest.createFunction(
  { 
    id: "job-harvested", 
    name: "Executive Chef: Hot Ingestion",
    triggers: [{ event: "job.harvested" }],
    concurrency: {
      limit: 10,
      key: "event.data.md5_hash || event.data.raw_url",
    }
  },
  async ({ event, step }) => {
    const { raw_title, raw_company, raw_url, raw_html, trace_id, region } = event.data;
    const { getCookablePayload, generateMd5Hash, cookAndStrategize } = await import("./chef-logic");

    // 1. STRATEGIZE: Generate Unified ID (The Identity Shield)
    const md5_hash = event.data.md5_hash || generateMd5Hash(raw_title, raw_company);

    // 2. PREP & COOK: Get Signal & Extra Intelligence
    const extraction = await step.run("prep-and-cook", async () => {
      const { config } = await import("../../../../../packages/config");
      const isPrimary = region === config.primary_region;

      // PREP: Hydrate ghostly leads
      const cookablePayload = await getCookablePayload({
        raw_payload: raw_html,
        source_url: raw_url
      });

      // COOK: AI Extraction & Sifting
      if (isPrimary) {
        return await cookAndStrategize(cookablePayload, {
          source: event.data.source,
          region: region
        });
      }

      // METADATA-ONLY for fallback regions
      const heuristic = siftOpportunity(raw_title, cookablePayload, raw_company, "Metadata Only");
      return {
        title: raw_title,
        company: raw_company,
        description: "Metadata signal sync.",
        salary: event.data.salary || null,
        niche: heuristic.domain,
        type: 'direct',
        locationType: 'remote',
        tier: heuristic.tier,
        relevanceScore: 0,
        isPhCompatible: heuristic.isPhCompatible,
        metadata: { meta_only: true, region }
      };
    });

    // 3. SIFTER GUARD: The Phosphorus Shield
    if (!extraction.isPhCompatible || (extraction.tier !== undefined && extraction.tier >= 4)) {
      console.warn(`🛡️ [PHOSPHORUS] Chef dropped signal: ${!extraction.isPhCompatible ? 'Geo' : 'Quality'} rejection for ${extraction.title}`);
      return { status: "dropped", reason: extraction.tier >= 4 ? "quality" : "geo", md5_hash };
    }

    // 4. PLATE: Deliver to Turso with the Freshness Shield (Titanium Resilience)
    const plateResult = await step.run("plate-to-turso", async () => {
      const { sql } = await import("drizzle-orm");
      const { db, withRetry: dbRetry } = await import("../../../../../packages/db/client");

      try {
        return await dbRetry(async () => {
          return await db.insert(opportunities).values({
            id: crypto.randomUUID(),
            md5_hash,
            title: extraction.title,
            company: extraction.company,
            url: raw_url,
            description: extraction.description, 
            salary: extraction.salary,
            niche: extraction.niche,
            type: extraction.type as any,
            locationType: extraction.locationType,
            sourcePlatform: event.data.source || "V12 Executive Chef",
            region: region || "Philippines", 
            scrapedAt: new Date(),
            isActive: true,
            tier: extraction.tier,
            relevanceScore: extraction.relevanceScore,
            latestActivityMs: Date.now(),
            metadata: JSON.stringify({ ...extraction.metadata, trace_id, hot_path: true }),
          }).onConflictDoUpdate({
            target: opportunities.md5_hash,
            set: {
              lastSeenAt: sql`CURRENT_TIMESTAMP`,
              latestActivityMs: Date.now()
            }
          });
        });
      } catch (err: any) {
        console.error(`💔 [TITANIUM] Turso Plating failed after retries. Initiating SHADOW PLATING...`);
        
        // 🛡️ SHADOW PLATING fallback to Supabase
        const { supabase } = await import("../../../../../packages/db/supabase");
        await supabase.from('raw_job_harvests').upsert({
          source_url: raw_url,
          raw_payload: raw_html,
          source_platform: event.data.source || "V12 Shadow Fallback",
          status: 'PLATED_STAGED',
          mapped_payload: extraction,
          error_log: `Shadow Plated: Turso unreachable - ${err.message}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'source_url' });

        return { status: "shadow_plated", reason: err.message };
      }
    });

    return { status: plateResult?.status || "plated", md5_hash };
  }
);

/**
 * 🛰️ SOVEREIGN SENTINEL: Unified Governance
 * Runs every 15 minutes to perform autonomous self-healing.
 * Absorbs: Silent Watchdog, Resilience Watchdog, and Vault Reaper.
 */
export const sentinelPulse = inngest.createFunction(
  { 
    id: "sentinel-pulse", 
    name: "Sovereign Sentinel: Autonomous Governance",
    triggers: [{ cron: "*/15 * * * *" }] // 15-minute resolution (Goldilocks requirement)
  },
  async ({ step }) => {
    console.log("🛡️ [SOVEREIGN] Sentinel Pulse initiating audit...");
    
    // 1. Diagnose and Repair (Defrost, Reap, Ghost Locks)
    const auditStatus = await step.run("autonomous-audit", async () => {
      const { sentinel } = await import("../../../../../packages/db/sentinel");
      await sentinel.diagnoseAndRepair("inngest-sovereign-pulse");
      return { status: "AUDIT_COMPLETE" };
    });

    // 2. Pulse Check (Site Health Verification)
    await step.run("verify-site-pulse", async () => {
      const { config } = await import("../../../../../packages/config");
      const siteUrl = process.env.PUBLIC_SITE_URL || "http://localhost:4321";
      
      try {
        const res = await fetch(`${siteUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Pulse degraded: ${res.status}`);
        console.log("✅ [SENTINEL] Site Pulse verified.");
      } catch (err: any) {
        console.warn(`⚠️ [SENTINEL] Site Pulse degraded: ${err.message}`);
        // Log to Turso for SRE visibility
        const { db } = await import("../../../../../packages/db");
        const { logs } = await import("../../../../../packages/db/schema");
        const { v4: uuidv4 } = await import("uuid");
        
        await db.insert(logs).values({
          id: uuidv4(),
          message: `Pulse Suspect: Site health degraded - ${err.message}`,
          level: 'warn',
          metadata: JSON.stringify({ context: 'sentinel', error: err.message }),
          timestamp: new Date()
        });
      }
    });

    return auditStatus;
  }
);

/**
 * 🛰️ SOVEREIGN FALLBACK: The Memorized Harvester
 * Runs every 30 minutes, but ONLY if the primary pulse is dead.
 * This is the "Zero-Credit Bridge" that ensures the site never stops if Cloudflare is down.
 */
export const scheduledHarvester = inngest.createFunction(
  { 
    id: "scheduled-harvester", 
    name: "Sovereign Fallback: Emergency Harvest",
    triggers: [{ cron: "*/30 * * * *" }] // 30-minute check
  },
  async ({ step }) => {
    // 1. Purity Check: Only run if the primary pulse is stale (> 2 hours)
    const canSkip = await step.run("check-pulse-staleness", async () => {
      const { db } = await import("../../../../../packages/db");
      const { vitals } = await import("../../../../../packages/db/schema");
      const { eq } = await import("drizzle-orm");
      
      const [record] = await db.select().from(vitals).where(eq(vitals.id, 'GLOBAL')).limit(1);
      if (!record || !record.lastHarvestAt) return false;

      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const isPulseFresh = (Date.now() - new Date(record.lastHarvestAt).getTime()) < TWO_HOURS_MS;
      
      return isPulseFresh;
    });

    if (canSkip) {
      console.log("🚜 [FALLBACK] Pulse is fresh. Skipping redundant harvest.");
      return { status: "skipped", reason: "pulse_fresh" };
    }

    console.warn("🚜 [FALLBACK] 🚨 Pulse stale! Initiating emergency redundant harvest...");

    const result = await step.run("execute-emergency-harvest", async () => {
      const { harvest } = await import("../../../../../jobs/scrape-opportunities");
      const { recordHarvestSuccess } = await import("../../../../../packages/db/governance");

      const harvestResult = await harvest({ 
        runnerId: "inngest-fallback",
        targetRegion: "Philippines" 
      });

      if (harvestResult.emitted > 0) {
        await recordHarvestSuccess("inngest-fallback", "Philippines");
      }

      return harvestResult;
    });

    return result;
  }
);
