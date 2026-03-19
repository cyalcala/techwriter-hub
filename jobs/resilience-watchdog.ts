import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb, systemHealth, opportunities } from "./lib/db";
import { sql, desc } from "drizzle-orm";

/**
 * 🛰️ RESILIENCE WATCHDOG
 * 
 * Runs every 6 hours to inspect the "Vitals" of the entire VA.INDEX pipeline.
 * It catches what scrapers miss: Logic Drift, Silent Blackouts, and Tier Volume Drops.
 */
export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */6 * * *", 
  maxDuration: 60,
  run: async () => {
    logger.info("[watchdog] Initiating Strategic Vitals Audit...");
    const db = createDb();
    
    const now = new Date();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    const vitals = {
      pulseOk: false,
      purityOk: false,
      sourcesDegraded: [] as string[],
      goldCount: 0,
      lastPulse: null as Date | null,
    };

    // 1. CHECK THE PULSE (Freshness)
    const latestSignal = await db.select({ scrapedAt: opportunities.scrapedAt })
      .from(opportunities)
      .orderBy(desc(opportunities.scrapedAt))
      .limit(1);
    
    vitals.lastPulse = latestSignal[0]?.scrapedAt || null;
    vitals.pulseOk = vitals.lastPulse ? vitals.lastPulse > fourHoursAgo : false;

    if (!vitals.pulseOk) {
      logger.error(`[watchdog] CRITICAL: System Pulse is weak. Last job discovered at ${vitals.lastPulse?.toISOString() || "NEVER"}. Scrapers may be stalled.`);
    }

    // 2. CHECK THE PURITY (Volume)
    const goldTier = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 1 AND is_active = 1`);
    vitals.goldCount = Number(goldTier.rows[0]?.[0] || 0);
    vitals.purityOk = vitals.goldCount >= 10;

    if (!vitals.purityOk) {
      logger.warn(`[watchdog] WARNING: Gold Tier Volume is low (${vitals.goldCount} jobs). Sifter may be too strict or sources are drying up.`);
    }

    // 3. CHECK SOURCE HEALTH
    const unhealthySources = await db.select()
      .from(systemHealth)
      .where(sql`status = 'FAIL' OR updatedAt < ${fourHoursAgo}`);
    
    vitals.sourcesDegraded = unhealthySources.map(s => s.sourceName);
    
    if (vitals.sourcesDegraded.length > 0) {
      logger.error(`[watchdog] DEGRADED SOURCES DETECTED: ${vitals.sourcesDegraded.join(", ")}`);
    }

    // 4. SUMMARY
    const score = (vitals.pulseOk ? 40 : 0) + (vitals.purityOk ? 40 : 0) + (vitals.sourcesDegraded.length === 0 ? 20 : 0);
    
    logger.info(`[watchdog] Audit Complete. Resilience Score: ${score}/100`);
    
    return {
      score,
      vitals,
      recommendation: score < 80 ? "Manual intervention or source replacement required." : "System healthy."
    };
  },
});
