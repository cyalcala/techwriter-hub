import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities } from "@va-hub/db/schema";
import { lte, and, eq } from "drizzle-orm";

/**
 * 💀 THE PERPETUAL REAPER (VAULT CLEANER)
 * 
 * Goal: Keep the Turso Gold Vault under 1GB permanently.
 * Rule 1: Delete all signals older than 60 days.
 * Rule 2: Exception for 'Platinum' (Tier 0) jobs might be added later.
 * Rule 3: Run every 24 hours at 3 AM.
 */
export const vaultReaperTask = schedules.task({
  id: "vault-reaper",
  cron: "0 3 * * *", 
  run: async () => {
    const { db, client } = createDb();
    const SIXTY_DAYS_AGO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    try {
      logger.info(`[reaper] Initiating Vault Pruning sweep. Target: < ${SIXTY_DAYS_AGO.toISOString()}`);

      // 1. Identify prune targets
      const result = await db.delete(opportunities)
        .where(
          and(
            lte(opportunities.createdAt, SIXTY_DAYS_AGO),
            eq(opportunities.isActive, false) // Only prune inactive/stale jobs to be safe
          )
        );

      logger.info(`[reaper] 🔪 Pruning complete. Signals removed: ${result.rowsAffected}`);
      
      // 2. Clear Truly Old Jobs regardless of state (Perpetual Insurance)
      const NINETY_DAYS_AGO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const hardPrune = await db.delete(opportunities)
        .where(lte(opportunities.createdAt, NINETY_DAYS_AGO));

      if (hardPrune.rowsAffected > 0) {
        logger.info(`[reaper] 🧨 Hard Prune (90d+) removed ${hardPrune.rowsAffected} legacy signals.`);
      }

    } catch (err: any) {
      logger.error(`[reaper] 🛑 Pruning cycle failed: ${err.message}`);
      throw err;
    } finally {
      await client.close();
    }
  },
});
