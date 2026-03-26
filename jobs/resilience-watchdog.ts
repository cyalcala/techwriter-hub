import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { systemHealth, opportunities } from "@va-hub/db/schema";
import { sql, desc } from "drizzle-orm";

export const resilienceWatchdogTask = schedules.task({
  id: "resilience-watchdog",
  cron: "0 */6 * * *", 
  maxDuration: 60,
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[watchdog] Initiating Strategic Vitals Audit...");
      
      const nowMs = Date.now();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const TWENTY_MINS_MS = 20 * 60 * 1000;
      
      const vitals = {
        pulseOk: false,
        stagnationOk: false,
        sourcesDegraded: [] as string[],
        goldCount: 0,
        lastPulse: null as number | null,
      };

      const latestSignal = await db.select({ scrapedAt: opportunities.scrapedAt })
        .from(opportunities)
        .orderBy(desc(opportunities.scrapedAt))
        .limit(1);
      
      vitals.lastPulse = latestSignal[0]?.scrapedAt ? new Date(latestSignal[0].scrapedAt).getTime() : null;
      vitals.pulseOk = vitals.lastPulse ? vitals.lastPulse > (nowMs - (2 * 60 * 60 * 1000)) : false;

      if (!vitals.pulseOk) {
        logger.error("[watchdog] CRITICAL STALENESS DETECTED (>2h). Triggering Conditional Burst Mode Harvest...");
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("harvest-opportunities", { mode: "BURST_MODE_RECOVERY" });
      }

      const recentWrites = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities WHERE scraped_at > ${nowMs - TWENTY_MINS_MS}`);
      const recentCount = Number(recentWrites.rows[0]?.[0] || 0);
      if (recentCount === 0 && vitals.pulseOk) { // Only minor if pulse is otherwise ok
        logger.warn("[watchdog] REAL-TIME GAP DETECTED. Forcing minor recovery.");
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("harvest-opportunities", { source: "watchdog-realtime-recovery" });
      }

      const goldTier = await db.run(sql`SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 1 AND is_active = 1`);
      vitals.goldCount = Number(goldTier.rows[0]?.[0] || 0);

      const unhealthySources = await db.select()
        .from(systemHealth)
        .where(sql`status = 'FAIL' OR (updatedAt IS NOT NULL AND updatedAt < ${nowMs - ONE_HOUR_MS})`);
      
      vitals.sourcesDegraded = unhealthySources.map((s: any) => s.sourceName);
      
      return { status: vitals.pulseOk ? "OK" : "BURST_MODE_ACTIVE", vitals };
    } finally {
      client.close();
    }
  },
});
