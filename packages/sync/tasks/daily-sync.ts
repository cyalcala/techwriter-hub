import { task, schedules } from "@trigger.dev/sdk/v3";
import { db } from "../../db/client";
import { agencies } from "../../db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import { RedditProvider } from "../lib/harvest/reddit";
import { BraveProvider } from "../lib/harvest/brave";
import { RemotiveProvider } from "../lib/harvest/remotive";
import { BlueSkyProvider } from "../lib/harvest/bluesky";
import { JobicyProvider } from "../lib/harvest/jobicy";
import { RawAgency } from "../lib/harvest/types";

function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  const dist = matrix[b.length][a.length];
  return 1 - dist / Math.max(a.length, b.length);
}

export const dailySyncTask = task({
  id: "daily-sync-v5-2",
  run: async (payload: any, { ctx }) => {
    console.log("Starting Filipino Agency Index Multi-Source Sync (V5.2)...");

    const providers = [
      new RedditProvider(),
      new BraveProvider(),
      new RemotiveProvider(),
      new BlueSkyProvider(),
      new JobicyProvider(),
    ];

    // 1. HARVEST: Run all providers in parallel
    const harvestResults = await Promise.all(
      providers.map(async (p) => {
        try {
          return await p.fetch();
        } catch (e) {
          console.error(`Provider ${p.name} failed:`, e);
          return [];
        }
      })
    );

    const allNewAgencies = harvestResults.flat();
    console.log(`Harvested ${allNewAgencies.length} raw records across all sources.`);

    // 2. DEDUPE & SYNC
    const existingAgencies = await db.select().from(agencies).all();
    const uniqueRecords: RawAgency[] = [];

    for (const remote of allNewAgencies) {
      let isDuplicate = false;
      for (const local of existingAgencies) {
        try {
          let score = 0;
          const remoteNormalized = remote.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const localNormalized = (local.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          try {
            // Priority 1: High-speed Zig engine
            score = parseFloat(
              execSync(`./zig-engine/match "${remote.name}" "${local.name}"`, { 
                timeout: 500, 
                stdio: 'pipe' 
              }).toString().trim()
            );
          } catch (e) {
            // Priority 2: TypeScript Fallback
            score = calculateSimilarity(remoteNormalized, localNormalized);
          }
          
          if (score > 0.88) {
            isDuplicate = true;
            await db.update(agencies)
              .set({ 
                lastSync: new Date(),
                lastSeenAt: new Date(),
                metadata: { ...(local.metadata as any), [remote.source]: remote.rawMetadata }
              })
              .where(eq(agencies.id, local.id));
            break;
          }
        } catch (e) {
          console.error(`Dedupe failed for ${remote.name}:`, e);
        }
      }

      if (!isDuplicate) {
        uniqueRecords.push(remote);
      }
    }

    // 3. VERIFY & PUBLISH
    const verifiedRecords = await Promise.all(
      uniqueRecords.map(async (agency) => {
        try {
          const res = await fetch(agency.hiringUrl, { method: "HEAD" });
          return {
            ...agency,
            id: crypto.randomUUID(),
            slug: agency.name.toLowerCase().replace(/\s+/g, '-'),
            status: (res.ok ? "active" : "quiet") as "active" | "quiet",
            lastSync: new Date(),
            lastSeenAt: new Date(),
            verifiedAt: new Date(),
            metadata: { [agency.source]: agency.rawMetadata }
          };
        } catch {
          return {
            ...agency,
            id: crypto.randomUUID(),
            slug: agency.name.toLowerCase().replace(/\s+/g, '-'),
            status: "quiet" as "active" | "quiet",
            lastSync: new Date(),
            lastSeenAt: new Date(),
            verifiedAt: new Date(),
            metadata: { [agency.source]: agency.rawMetadata }
          };
        }
      })
    );

    if (verifiedRecords.length > 0) {
      await db.insert(agencies).values(verifiedRecords as any);
      console.log(`Successfully added ${verifiedRecords.length} new agencies.`);
    }

    return { totalHarvested: allNewAgencies.length, newAdded: verifiedRecords.length };
  },
});

// Twice-Daily Sync Orchestration (Every 12 hours)
export const dailySyncSchedule = schedules.create({
  task: dailySyncTask.id,
  cron: "0 */12 * * *",
  deduplicationKey: "twice-daily-sync-v5-2",
});
