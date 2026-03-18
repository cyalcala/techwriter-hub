import { schedules } from "@trigger.dev/sdk/v3";
import { db, schema } from "@va-hub/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";
import { count, eq, sql } from "drizzle-orm";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Sources that are already PH-focused — skip relevancy filter for these
const PH_NATIVE_SOURCES = new Set(["Indeed", "OnlineJobs"]);

export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  cron: "0 */2 * * *", // every 2 hours
  maxDuration: 120,
  run: async () => {
    console.log("[harvest] Starting opportunity harvest...");

    const results = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const allItems = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    console.log(`[harvest] Fetched ${allItems.length} items from ${rssSources.length} sources`);

    // Log per-source breakdown
    results.forEach((r, i) => {
      const src = rssSources[i];
      const count = r.status === "fulfilled" ? r.value.length : 0;
      const status = r.status === "fulfilled" ? "OK" : `FAIL: ${r.reason?.message}`;
      console.log(`  → ${src.name}: ${count} items (${status})`);
    });

    if (allItems.length === 0) {
      console.log("[harvest] Zero items fetched. All sources may be down.");
      return { inserted: 0, skipped: 0, reason: "no_data_from_sources" };
    }

    // Dedup against existing data
    const existingItems = await db.select({ hash: schema.opportunities.contentHash, title: schema.opportunities.title }).from(schema.opportunities);
    const existingHashes = new Set(existingItems.map((r: any) => r.hash));
    const normalizedExisting = new Set(existingItems.map((r: any) => normalizeTitle(r.title)));

    const newItems = allItems.filter((item) => {
      if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
      if (normalizedExisting.has(normalizeTitle(item.title))) return false;
      return true;
    });
    console.log(`[harvest] ${newItems.length} unique items after dedup`);

    // Smart filter: PH-native sources bypass the keyword filter entirely
    const relevantItems = newItems.filter(item => {
      // If it came from Indeed PH or OnlineJobs, it's already relevant
      if (item.sourcePlatform && PH_NATIVE_SOURCES.has(item.sourcePlatform)) {
        return true;
      }

      // For global sources, check for any remote/hiring signal
      const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
      
      // Any of these keywords = relevant
      const signals = [
        "remote", "virtual", "assistant", "freelance", "outsource",
        "offshore", "philippines", "filipino", "manila", "cebu",
        "apply", "hiring", "urgent", "contract", "part-time",
        "customer support", "data entry", "bookkeeping", "social media",
        "admin", "executive assistant", "project manager"
      ];

      return signals.some(kw => text.includes(kw));
    });

    console.log(`[harvest] ${relevantItems.length} passed relevancy filter (${newItems.length - relevantItems.length} filtered out)`);

    let inserted = 0;
    for (let i = 0; i < relevantItems.length; i += 50) {
      try {
        const batch = relevantItems.slice(i, i + 50).map(item => ({
          ...item,
          id: crypto.randomUUID(),
          scrapedAt: new Date(),
          postedAt: item.postedAt ? new Date(item.postedAt) : null,
        }));
        await db.insert(schema.opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error("[harvest] Batch insert failed:", err);
      }
    }

    // --- INTELLIGENT STATUS SYNC ---
    console.log("[harvest] Syncing agency hiring heat...");
    const activeAgencies = await db.select().from(schema.agencies);
    for (const agency of activeAgencies) {
      try {
        const [{ count: jobCount }] = await db
          .select({ count: count() })
          .from(schema.opportunities)
          .where(
            sql`${schema.opportunities.company} = ${agency.name} AND ${schema.opportunities.isActive} = true`
          );
        
        const newHeat = (jobCount as number) > 5 ? 3 : (jobCount as number) > 0 ? 2 : 1;
        
        await db.update(schema.agencies)
          .set({ hiringHeat: newHeat })
          .where(eq(schema.agencies.id, agency.id));
      } catch {
        // Skip agencies that fail — don't crash the whole sync
      }
    }

    console.log(`[harvest] Complete. Inserted ${inserted} new opportunities.`);
    return { inserted, skipped: allItems.length - inserted };
  },
});
