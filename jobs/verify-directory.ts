import { schedules } from "@trigger.dev/sdk/v3";
import { eq, isNotNull } from "drizzle-orm";
import { createDb, vaDirectory } from "./lib/db";

export const verifyDirectoryTask = schedules.task({
  id: "verify-directory",
  cron: "0 7 * * 1", // every Monday 7am UTC
  maxDuration: 180,
  run: async () => {
    const db = createDb();
    const entries = await db
      .select({ id: vaDirectory.id, companyName: vaDirectory.companyName, hiringPageUrl: vaDirectory.hiringPageUrl })
      .from(vaDirectory)
      .where(isNotNull(vaDirectory.hiringPageUrl));

    console.log(`[verify-directory] Checking ${entries.length} entries...`);
    let verified = 0, failed = 0;

    for (const entry of entries) {
      if (!entry.hiringPageUrl) continue;
      try {
        const res = await fetch(entry.hiringPageUrl, { method: "HEAD", signal: AbortSignal.timeout(10_000), redirect: "follow" });
        if (res.ok) {
          await db.update(vaDirectory).set({ verifiedAt: new Date().toISOString() }).where(eq(vaDirectory.id, entry.id));
          verified++;
        } else { failed++; }
      } catch { failed++; }
    }

    console.log(`[verify-directory] verified=${verified} failed=${failed}`);
    return { checked: entries.length, verified, failed };
  },
});
