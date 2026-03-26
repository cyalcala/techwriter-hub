import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { systemHealth, opportunities } from "@va-hub/db/schema";
import { sql, desc, eq, and, gt } from "drizzle-orm";

export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */6 * * *", 
  maxDuration: 300, // Increased timeout 
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[watchdog] Initiating Strategic Vitals Audit...");
      
      const nowMs = Date.now();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const TWENTY_MINS_MS = 20 * 60 * 1000;
      
      const vitals: any = {
        pulseOk: false,
        stagnationOk: false,
        sourcesDegraded: [],
        goldCount: 0,
        lastPulse: null,
      };

      // 1. Check Pulse (Last Scrape)
      try {
        const latestSignal = await db.select({ scrapedAt: opportunities.scrapedAt })
          .from(opportunities)
          .orderBy(desc(opportunities.scrapedAt))
          .limit(1);
        
        vitals.lastPulse = latestSignal[0]?.scrapedAt ? new Date(latestSignal[0].scrapedAt).getTime() : null;
        vitals.pulseOk = vitals.lastPulse ? vitals.lastPulse > (nowMs - (2 * 60 * 60 * 1000)) : false;

        if (!vitals.pulseOk) {
          logger.error("[watchdog] CRITICAL STALENESS DETECTED (>2h). Triggering Burst Mode...");
          await tasks.trigger("harvest-opportunities", { mode: "BURST_MODE_RECOVERY" });
        }
      } catch (err: any) {
        logger.error("[watchdog] Pulse Check Failed:", err.message);
      }

      // 2. Real-time Gap Check (Last 20 mins)
      try {
        const recentWrites = await db.select({ count: sql<number>`count(*)` })
          .from(opportunities)
          .where(gt(opportunities.scrapedAt, new Date(nowMs - TWENTY_MINS_MS)));
        
        const recentCount = Number(recentWrites[0]?.count || 0);
        if (recentCount === 0 && vitals.pulseOk) {
          logger.warn("[watchdog] REAL-TIME GAP. Triggering minor recovery.");
          await tasks.trigger("harvest-opportunities", { source: "watchdog-recovery" });
        }
      } catch (err: any) {
        logger.error("[watchdog] Gap Check Failed:", err.message);
      }

      // 3. Gold Tier Count
      try {
        const goldTier = await db.select({ count: sql<number>`count(*)` })
          .from(opportunities)
          .where(and(eq(opportunities.tier, 1), eq(opportunities.isActive, true)));
        vitals.goldCount = Number(goldTier[0]?.count || 0);
      } catch (err: any) {
        logger.error("[watchdog] Gold Audit Failed:", err.message);
      }

      // 4. Source Degradation
      try {
        const unhealthySources = await db.select()
          .from(systemHealth)
          .where(sql`status = 'FAIL' OR (updatedAt IS NOT NULL AND updatedAt < ${new Date(nowMs - ONE_HOUR_MS).getTime()})`);
        
        vitals.sourcesDegraded = unhealthySources.map((s: any) => s.sourceName);
      } catch (err: any) {
        logger.error("[watchdog] Source Audit Failed:", err.message);
      }
      
      return { status: "COMPLETED", vitals };
    } finally {
      await client.close();
    }
  },
});
