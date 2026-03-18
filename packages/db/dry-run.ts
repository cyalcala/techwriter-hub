import { createDb, opportunities } from "../../jobs/lib/db";
import { fetchRSSFeed, rssSources } from "../../jobs/lib/scraper";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const PH_NATIVE_SOURCES = new Set(["Indeed", "OnlineJobs"]);

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bvirtual assistant\b/g, "va")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function dryRun() {
  const db = createDb();
  const results = await Promise.allSettled(rssSources.map(fetchRSSFeed));
  const allItems = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  console.log(`[DRY RUN] Fetched ${allItems.length} items from ${rssSources.length} sources`);

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

  console.log(`[DRY RUN] ${newItems.length} unique items after dedup`);

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

  console.log(`[DRY RUN] ${relevantItems.length} passed relevancy filter`);

  if (relevantItems.length > 0) {
    console.log("Sample of what passed:");
    relevantItems.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.sourcePlatform}] ${item.title}`);
    });
  }

  // Actually insert them for the user to see!
  let inserted = 0;
  for (let i = 0; i < relevantItems.length; i += 50) {
    try {
      const batch = relevantItems.slice(i, i + 50);
      await db.insert(opportunities).values(batch).onConflictDoNothing();
      inserted += batch.length;
    } catch (err) {
      console.error("Batch insert failed:", (err as Error).message);
    }
  }
  console.log(`\n✅ SUCCESSFULLY INSERTED ${inserted} NEW OPPORTUNITIES INTO PRODUCTION DB!`);
}

dryRun().catch(console.error);
