import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { sql } from "drizzle-orm";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 */7 * * *", 
  maxDuration: 300, 
  run: async () => {
    const { db, client } = createDb();
    try {
      logger.info("[watchdog] Starting Deep Schema Audit & Purification...");
      
      const nowMs = Date.now();
      const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      // 1. Purge Inactive (60d)
      const purgeInactive = await db.run(sql`
        DELETE FROM opportunities 
        WHERE is_active = 0 
        AND scraped_at < ${nowMs - SIXTY_DAYS_MS}
      `);
      
      // 2. Purge Trash (7d)
      const purgeTier4 = await db.run(sql`
        DELETE FROM opportunities 
        WHERE (tier = 4 OR tier IS NULL)
        AND scraped_at < ${nowMs - SEVEN_DAYS_MS}
      `);

      // 3. Deactivate "Watermelons" (Stale for >72h)
      const deactivateWatermelons = await db.run(sql`
        UPDATE opportunities 
        SET is_active = 0 
        WHERE is_active = 1 
        AND scraped_at < ${nowMs - SEVENTY_TWO_HOURS_MS}
      `);

      // 4. Hard-Kill Ratholes
      const purgeRatholes = await db.run(sql`
        UPDATE opportunities 
        SET is_active = 0 
        WHERE is_active = 1 
        AND source_platform IN ('RemoteOK', 'WeWorkRemotely', 'Jobicy', 'Reddit r/VirtualAssistant', 'Reddit r/forhire', 'Reddit r/remotejobs', 'rss')
      `);

      logger.info(`[watchdog] Maintenance Complete.`, {
        purged: purgeInactive.rowsAffected + purgeTier4.rowsAffected,
        watermelons: deactivateWatermelons.rowsAffected,
        ratholes: purgeRatholes.rowsAffected
      });
      
      return { status: "HEALTHY" };
    } finally {
      await client.close();
    }
  },
});
