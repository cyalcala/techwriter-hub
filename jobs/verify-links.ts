import { schedules } from "@trigger.dev/sdk/v3";
import { db, opportunities } from "@va-hub/db";
import { eq } from "drizzle-orm";

/**
 * Verify Links Job (Phase 4 — Self-Maintenance)
 *
 * Runs daily. Checks all active opportunity URLs.
 * Marks is_active = false if the URL returns 404 or fails.
 * Keeps the feed clean without manual intervention.
 */
export const verifyLinksTask = schedules.task({
  id: "verify-links",
  cron: "0 6 * * *", // Daily at 6am UTC (2pm Manila)
  maxDuration: 300, // 5 minutes
  run: async () => {
    console.log("[verify-links] Starting link verification...");

    const activeOpps = await db
      .select({ id: opportunities.id, sourceUrl: opportunities.sourceUrl })
      .from(opportunities)
      .where(eq(opportunities.isActive, true));

    console.log(`[verify-links] Checking ${activeOpps.length} active links...`);

    let deactivated = 0;
    const CONCURRENCY = 10;

    for (let i = 0; i < activeOpps.length; i += CONCURRENCY) {
      const batch = activeOpps.slice(i, i + CONCURRENCY);

      await Promise.allSettled(
        batch.map(async ({ id, sourceUrl }) => {
          try {
            const res = await fetch(sourceUrl, {
              method: "HEAD",
              signal: AbortSignal.timeout(8_000),
              redirect: "follow",
            });

            if (res.status === 404 || res.status === 410) {
              await db
                .update(opportunities)
                .set({ isActive: false })
                .where(eq(opportunities.id, id));
              deactivated++;
              console.log(`[verify-links] Deactivated ${id}: ${sourceUrl} (${res.status})`);
            }
          } catch {
            // Network error — don't deactivate, might be transient
          }
        })
      );
    }

    console.log(`[verify-links] Done. Deactivated ${deactivated} stale links.`);
    return { checked: activeOpps.length, deactivated };
  },
});
