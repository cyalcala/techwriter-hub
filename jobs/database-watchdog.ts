import { schedules } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { sql } from "drizzle-orm";

export const databaseWatchdogTask = schedules.task({
  id: "database-watchdog",
  cron: "0 */7 * * *", 
  maxDuration: 60,
  run: async () => {
    const { db, client } = createDb();
    try {
      console.log("[watchdog] Starting Deep Schema Audit (7h Interval)...");
      
      const nowMs = Date.now();
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const TWENTY_ONE_DAYS_MS = 21 * 24 * 60 * 60 * 1000;

      const purgeInactive = await db.run(sql`
        DELETE FROM opportunities 
        WHERE is_active = 0 
        AND scraped_at < ${nowMs - SIXTY_DAYS_MS}
      `);
      
      const purgeTier4 = await db.run(sql`
        DELETE FROM opportunities 
        WHERE (tier = 4 OR tier IS NULL)
        AND scraped_at < ${nowMs - SEVEN_DAYS_MS}
      `);

      const deactivateZombies = await db.run(sql`
        UPDATE opportunities 
        SET is_active = 0 
        WHERE is_active = 1 
        AND posted_at IS NOT NULL 
        AND posted_at > 0 
        AND posted_at < ${nowMs - TWENTY_ONE_DAYS_MS}
      `);

      console.log(`[watchdog] Maintenance Complete. Purged: ${purgeInactive.rowsAffected + purgeTier4.rowsAffected}, Deactivated: ${deactivateZombies.rowsAffected}`);
      return { status: "HEALTHY" };
    } finally {
      client.close();
    }
  },
});
