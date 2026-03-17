import { schedules } from "@trigger.dev/sdk/v3";
import { db, vaDirectory } from "@va-hub/db";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Verify Directory Job (Phase 4 — Self-Maintenance)
 *
 * Runs weekly. Pings hiring page URLs in the VA directory.
 * Updates verified_at timestamp if reachable, logs failures for manual review.
 */
export const verifyDirectoryTask = schedules.task({
  id: "verify-directory",
  cron: "0 7 * * 1", // Every Monday at 7am UTC
  maxDuration: 180,
  run: async () => {
    console.log("[verify-directory] Starting directory verification...");

    const entries = await db
      .select({
        id: vaDirectory.id,
        companyName: vaDirectory.companyName,
        hiringPageUrl: vaDirectory.hiringPageUrl,
      })
      .from(vaDirectory)
      .where(isNotNull(vaDirectory.hiringPageUrl));

    console.log(`[verify-directory] Checking ${entries.length} directory entries...`);

    let verified = 0;
    let failed = 0;

    for (const entry of entries) {
      if (!entry.hiringPageUrl) continue;

      try {
        const res = await fetch(entry.hiringPageUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(10_000),
          redirect: "follow",
        });

        if (res.ok) {
          await db
            .update(vaDirectory)
            .set({ verifiedAt: new Date().toISOString() })
            .where(eq(vaDirectory.id, entry.id));
          verified++;
        } else {
          console.warn(
            `[verify-directory] ${entry.companyName}: ${res.status} — ${entry.hiringPageUrl}`
          );
          failed++;
        }
      } catch (err) {
        console.warn(`[verify-directory] ${entry.companyName}: network error — ${entry.hiringPageUrl}`);
        failed++;
      }
    }

    console.log(`[verify-directory] Done. Verified: ${verified}, Failed: ${failed}`);
    return { checked: entries.length, verified, failed };
  },
});
