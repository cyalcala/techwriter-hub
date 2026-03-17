import { schedules } from "@trigger.dev/sdk/v3";
import { db, opportunities } from "@va-hub/db";
import { fetchRSSFeed, fetchHTMLSource, rssSources, htmlSources } from "@va-hub/scraper";
import { eq } from "drizzle-orm";

/**
 * Scrape Opportunities Job
 *
 * Runs every 2 hours to stay within Trigger.dev free tier (750 runs/month).
 * Fetches RSS + HTML sources, deduplicates by contentHash, writes new items to Turso.
 * Triggers Vercel ISR revalidation after writing.
 */
export const scrapeOpportunitiesTask = schedules.task({
  id: "scrape-opportunities",
  // Every 2 hours — 360 runs/month, leaves ~390 for retries + digest job
  cron: "0 */2 * * *",
  maxDuration: 120, // seconds
  run: async () => {
    console.log("[scrape] Starting opportunity scrape...");

    // ── 1. Fetch all sources ──────────────────────────────────────────────────
    const rssResults = await Promise.allSettled(
      rssSources.map((source) => fetchRSSFeed(source))
    );
    const htmlResults = await Promise.allSettled(
      htmlSources.map((source) => fetchHTMLSource(source))
    );

    const allItems = [
      ...rssResults.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
      ...htmlResults.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    ];

    console.log(`[scrape] Total items fetched: ${allItems.length}`);

    if (allItems.length === 0) {
      console.log("[scrape] No items fetched. Exiting.");
      return { inserted: 0, skipped: 0 };
    }

    // ── 2. Deduplicate against existing records ───────────────────────────────
    // Get existing hashes in a single query
    const existingHashes = new Set(
      (await db.select({ hash: opportunities.contentHash }).from(opportunities)).map(
        (r) => r.hash
      )
    );

    const newItems = allItems.filter(
      (item) => item.contentHash && !existingHashes.has(item.contentHash)
    );

    console.log(
      `[scrape] New items after dedup: ${newItems.length} (skipped ${allItems.length - newItems.length})`
    );

    // ── 3. Write to database in batches ───────────────────────────────────────
    let inserted = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(opportunities).values(batch).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.error(`[scrape] Batch insert failed:`, err);
      }
    }

    console.log(`[scrape] Inserted ${inserted} new opportunities.`);

    // ── 4. Trigger Vercel ISR revalidation ────────────────────────────────────
    if (inserted > 0) {
      await revalidateVercel();
    }

    return { inserted, skipped: allItems.length - inserted };
  },
});

async function revalidateVercel() {
  const secret = process.env.VERCEL_REVALIDATE_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!secret || !appUrl) {
    console.warn("[scrape] Revalidation skipped — VERCEL_REVALIDATE_SECRET or NEXT_PUBLIC_APP_URL not set");
    return;
  }

  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      console.log("[scrape] Vercel ISR revalidation triggered.");
    } else {
      console.warn(`[scrape] Revalidation returned ${res.status}`);
    }
  } catch (err) {
    console.error("[scrape] Revalidation request failed:", err);
  }
}
