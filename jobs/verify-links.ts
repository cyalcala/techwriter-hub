import { schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { createDb, opportunities } from "./lib/db";

export const verifyLinksTask = schedules.task({
  id: "verify-links",
  cron: "0 6 * * *", // daily 6am UTC
  maxDuration: 300,
  run: async () => {
    const db = createDb();
    const active = await db
      .select({ id: opportunities.id, sourceUrl: opportunities.sourceUrl })
      .from(opportunities)
      .where(eq(opportunities.isActive, true));

    console.log(`[verify-links] Checking ${active.length} links...`);
    let deactivated = 0;

    for (let i = 0; i < active.length; i += 10) {
      await Promise.allSettled(
        active.slice(i, i + 10).map(async ({ id, sourceUrl }) => {
          try {
            const res = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(8_000), redirect: "follow" });
            if (res.status === 404 || res.status === 410) {
              await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, id));
              deactivated++;
            }
          } catch {}
        })
      );
    }

    console.log(`[verify-links] Deactivated ${deactivated}`);
    return { checked: active.length, deactivated };
  },
});
