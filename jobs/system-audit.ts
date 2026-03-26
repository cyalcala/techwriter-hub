import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

export const systemAuditTask = schedules.task({
  id: "deep-system-audit",
  cron: "0 0 * * *", 
  maxDuration: 180,
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[deep-audit] Initiating surgical system audit...");
      
      const nowMs = Date.now();
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      const report = {
        ratholesClosed: 0,
        silentFailuresDetected: false,
        fakeriesScrubbed: 0,
        agenciesCorrected: 0,
        healthScore: 100
      };

      try {
        logger.info("[deep-audit] System Checkpoint: Capturing autonomous git/database snapshot...");
        execSync("bun run save").toString();
      } catch (err: any) {
        logger.warn(`[deep-audit] Failed to construct system snapshot: ${err.message}`);
      }

      const staleThreshold = nowMs - TWO_WEEKS_MS;
      const staleRotQuery = await db.run(
        sql`UPDATE opportunities 
            SET is_active = 0 
            WHERE is_active = 1 
              AND scraped_at < ${staleThreshold}`
      );
      report.ratholesClosed = staleRotQuery.rowsAffected;

      const yesterdayThreshold = nowMs - ONE_DAY_MS;
      const freshSignalQuery = await db.all(
        sql`SELECT COUNT(id) as freshCount FROM opportunities WHERE scraped_at > ${yesterdayThreshold}`
      ) as any[];
      
      const freshCount = freshSignalQuery[0]?.freshCount || 0;
      if (freshCount === 0) {
        logger.error("[deep-audit] CRITICAL SILENT FAILURE: 0 new signals in the last 24 hours.");
        report.silentFailuresDetected = true;
        report.healthScore -= 50;
      }

      const evasionRegex = [/\$?\d+\s*\/\s*(day|wk|hr)/i, /(t\.me|wa\.me)/i, /no experience.*make \$/i];
      const activeOpps = await db.all(
        sql`SELECT id, title, description FROM opportunities WHERE is_active = 1`
      ) as { id: string, title: string, description: string }[];
      
      for (const opp of activeOpps) {
        if (evasionRegex.some(regex => regex.test(`${opp.title} ${opp.description}`))) {
          await db.run(sql`UPDATE opportunities SET is_active = 0 WHERE id = ${opp.id}`);
          report.fakeriesScrubbed++;
        }
      }
      
      const orphanedAgencies = await db.run(
        sql`UPDATE agencies SET status = 'quiet' WHERE status = 'active' AND (hiring_url IS NULL OR hiring_url = '')`
      );
      report.agenciesCorrected = orphanedAgencies.rowsAffected;

      logger.info(`[deep-audit] System Audit Complete. Health Score: ${report.healthScore}/100.`);
      return report;
    } finally {
      client.close();
    }
  },
});
