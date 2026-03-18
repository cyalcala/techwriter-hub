import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { eq, isNotNull } from "drizzle-orm";

export const verifyDirectoryTask = schedules.task({
  id: "verify-directory",
  cron: "0 7 * * 1", // every Monday 7am UTC
  maxDuration: 180,
  run: async () => {
    console.log("[verify-directory] Checking agency entries...");
    const entries = await db
      .select({ id: schema.agencies.id, name: schema.agencies.name, hiringUrl: schema.agencies.hiringUrl })
      .from(schema.agencies)
      .where(isNotNull(schema.agencies.hiringUrl));

    console.log(`[verify-directory] Checking ${entries.length} entries...`);
    let verified = 0, failed = 0;

    for (const entry of entries) {
      if (!entry.hiringUrl) continue;
      
      try {
        const res = await fetch(entry.hiringUrl, { 
          method: "GET", 
          signal: AbortSignal.timeout(15_000), 
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; va-hub-verifier/1.2; +https://va-index.com)" }
        });

        // FULL BODY INSPECTION to prevent "Homepage Redirect" fakery
        const html = (await res.text()).toLowerCase();
        const recruitmentKeywords = ["apply", "career", "job", "hiring", "portal", "opportunity", "opening", "resume", "cv"];
        const hasRecruitmentSignal = recruitmentKeywords.some(kw => html.includes(kw));

        if (res.ok && hasRecruitmentSignal) {
          await db.update(schema.agencies)
            .set({ verifiedAt: new Date() })
            .where(eq(schema.agencies.id, entry.id));
          verified++;
        } else { 
          console.log(`[verify-directory] Potential Fakery/Mismatch: ${entry.name} - No recruitment signal in body.`);
          failed++; 
        }
      } catch (err) {
        console.log(`[verify-directory] Link Failed: ${entry.name} - ${err.message}`);
        failed++;
      }
    }

    console.log(`[verify-directory] verified=${verified} failed=${failed}`);
    return { checked: entries.length, verified, failed };
  },
});
