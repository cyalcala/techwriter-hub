import { schedules } from "@trigger.dev/sdk/v3";
import { createDb, opportunities } from "./lib/db";
import { fetchRSSFeed, rssSources } from "./lib/scraper";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Sources that are already PH-focused — skip relevancy filter
const PH_NATIVE_SOURCES = new Set(["Indeed", "OnlineJobs"]);

export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  cron: "0 */2 * * *", // every 2 hours
  maxDuration: 120,
  run: async () => {
    console.log("[harvest] Starting opportunity harvest...");

    const db = createDb();

    const results = await Promise.allSettled(rssSources.map(fetchRSSFeed));
    const allItems = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    console.log(`[harvest] Fetched ${allItems.length} items from ${rssSources.length} sources`);

    // Log per-source breakdown
    results.forEach((r, i) => {
      const src = rssSources[i];
      const cnt = r.status === "fulfilled" ? r.value.length : 0;
      const status = r.status === "fulfilled" ? "OK" : `FAIL: ${(r.reason as Error)?.message}`;
      console.log(`  → ${src.name}: ${cnt} items (${status})`);
    });

    if (allItems.length === 0) {
      console.log("[harvest] Zero items fetched. All sources may be down.");
      return { inserted: 0, skipped: 0, reason: "no_data_from_sources" };
    }

    // Dedup against existing data
    const existingItems = await db.select({
      hash: opportunities.contentHash,
      title: opportunities.title
    }).from(opportunities);

    const existingHashes = new Set(existingItems.map((r) => r.hash));
    const normalizedExisting = new Set(existingItems.map((r) => normalizeTitle(r.title)));

    const newItems = allItems.filter((item) => {
      if (!item.contentHash || existingHashes.has(item.contentHash)) return false;
      if (normalizedExisting.has(normalizeTitle(item.title))) return false;
      return true;
    });
    console.log(`[harvest] ${newItems.length} unique items after dedup`);

    // Smart filter: PH-native sources bypass relevancy check
    const relevantItems = newItems.filter(item => {
      if (item.sourcePlatform && PH_NATIVE_SOURCES.has(item.sourcePlatform)) {
        return true;
      }

      const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
      const signals = [
        "remote", "virtual", "assistant", "freelance", "outsource",
        "offshore", "philippines", "filipino", "manila", "cebu",
        "apply", "hiring", "urgent", "contract", "part-time",
        "customer support", "data entry", "bookkeeping", "social media",
        "admin", "executive assistant", "project manager"
      ];
      return signals.some(kw => text.includes(kw));
    });

    console.log(`[harvest] ${relevantItems.length} passed relevancy filter`);

    let inserted = 0;
    for (let i = 0; i < relevantItems.length; i += 50) {
      try {
        const batch = relevantItems.slice(i, i + 50);
        await db.insert(opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error("[harvest] Batch insert failed:", (err as Error).message);
      }
    }

    console.log(`[harvest] Complete. Inserted ${inserted} new opportunities.`);
    return { inserted, skipped: allItems.length - inserted };
  },
});
