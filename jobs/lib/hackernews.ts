/**
 * Hacker News "Who is Hiring?" Harvester
 * 
 * Uses HN's free public Firebase API (hacker-news.firebaseio.com).
 * Harvests comments from the monthly "Ask HN: Who is hiring?" threads.
 * These contain 500+ high-value remote tech roles per month.
 */

import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

const HN_API = "https://hacker-news.firebaseio.com/v0";

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

async function findWhoIsHiringThread(): Promise<number | null> {
  try {
    // Search for the latest "Who is hiring?" thread by the monthly poster (whoishiring)
    const res = await fetch(`${HN_API}/user/whoishiring.json`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const user = await res.json();
    const submitted = user?.submitted || [];

    // Check the most recent submissions to find a "Who is hiring" thread
    for (const id of submitted.slice(0, 5)) {
      const itemRes = await fetch(`${HN_API}/item/${id}.json`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!itemRes.ok) continue;
      const item = await itemRes.json();
      if (item?.title?.toLowerCase()?.includes("who is hiring")) {
        return id;
      }
    }
  } catch (err) {
    console.log("[hn] Failed to find hiring thread:", (err as Error).message);
  }
  return null;
}

export async function fetchHNJobs(): Promise<NewOpportunity[]> {
  const threadId = await findWhoIsHiringThread();
  if (!threadId) {
    console.log("[hn] No active 'Who is hiring?' thread found");
    return [];
  }

  console.log(`[hn] Found thread #${threadId}, fetching comments...`);

  try {
    const threadRes = await fetch(`${HN_API}/item/${threadId}.json`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!threadRes.ok) return [];
    const thread = await threadRes.json();
    const kidIds: number[] = (thread.kids || []).slice(0, 100); // Top 100 comments

    const jobs: NewOpportunity[] = [];

    // Fetch comments in batches of 10
    for (let i = 0; i < kidIds.length; i += 10) {
      const batch = kidIds.slice(i, i + 10);
      const comments = await Promise.allSettled(
        batch.map(async (id) => {
          const r = await fetch(`${HN_API}/item/${id}.json`, {
            signal: AbortSignal.timeout(5_000),
          });
          return r.ok ? r.json() : null;
        })
      );

      for (const result of comments) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const comment = result.value;
        if (!comment.text || comment.dead || comment.deleted) continue;

        const text = comment.text.replace(/<[^>]*>/g, " ").trim();
        if (text.length < 30) continue;

        // Extract company name from first line (HN convention: "Company | Role | Location | ...")
        const firstLine = text.split("\n")[0].split("|")[0].trim();
        const company = firstLine.slice(0, 80) || "HN Hiring";

        // Extract a role title — look for common patterns
        const parts = text.split("|").map((s: string) => s.trim());
        const role = parts[1]?.slice(0, 100) || parts[0]?.slice(0, 100) || "Tech Role";

        const sourceUrl = `https://news.ycombinator.com/item?id=${comment.id}`;

        jobs.push({
          id: crypto.randomUUID(),
          title: role,
          company,
          type: "full-time",
          sourceUrl,
          sourcePlatform: "HackerNews",
          tags: ["tech", "remote", "high-value"],
          locationType: "remote",
          payRange: null,
          description: text.slice(0, 500),
          postedAt: comment.time ? new Date(comment.time * 1000) : new Date(),
          scrapedAt: new Date(),
          isActive: true,
          contentHash: toHash(role, sourceUrl),
        } as unknown as NewOpportunity);
      }
    }

    console.log(`[hn] Harvested ${jobs.length} roles from thread #${threadId}`);
    return jobs;
  } catch (err) {
    console.log("[hn] Failed to fetch comments:", (err as Error).message);
    return [];
  }
}
