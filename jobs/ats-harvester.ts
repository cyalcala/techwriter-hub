import { task, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities as opportunitiesSchema, type NewOpportunity } from "@va-hub/db/schema";
import { atsSources } from "@va-hub/config/ats-sources";
import { siftOpportunity, OpportunityTier } from "./lib/sifter";
import { v4 as uuidv4 } from 'uuid';
import { sql } from "drizzle-orm";

/**
 * 🛰️ ATS SITEMAP SNIPER
 * 
 * Surgically targets Greenhouse, Lever, and specialized Agency feeds.
 */

export const atsSniperTask = task({
  id: "ats-sniper",
  run: async () => {
    logger.info("Starting Surgical ATS Sniper Run...");
    const { db, client } = createDb();
    
    try {
      let totalCaptured = 0;
      let totalSifted = 0;

      for (const source of atsSources) {
        try {
          logger.info(`[sniper] Target: ${source.name} (${source.type})`);
          let rawJobs: any[] = [];

          if (source.type === "greenhouse") {
            const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${source.token}/jobs`);
            const data = await res.json();
            rawJobs = data.jobs || [];
          } else if (source.type === "lever") {
            const res = await fetch(`https://api.lever.co/v0/postings/${source.token}?mode=json`);
            rawJobs = await res.json();
          } else if (source.type === "zoho") {
            // Zoho Recruit Public JSON
            const res = await fetch(`https://recruit.zoho.eu/recruit/v2/PublicPostings?board_url=${source.token}`);
            const data = await res.json();
            rawJobs = data.data || [];
          } else if (source.type === "rss") {
            const res = await fetch(source.token);
            const xml = await res.text();
            const { XMLParser } = await import("fast-xml-parser");
            const parser = new XMLParser();
            const data = parser.parse(xml);
            const items = data.rss?.channel?.item || [];
            rawJobs = Array.isArray(items) ? items : [items];
          }

          if (rawJobs.length === 0) continue;

          const batch: NewOpportunity[] = [];
          const now = new Date();

          for (const raw of rawJobs) {
            let title = "", url = "", description = "";

            if (source.type === "greenhouse") {
              title = raw.title; url = raw.absolute_url; description = raw.content || "";
            } else if (source.type === "lever") {
              title = raw.text; url = raw.hostedUrl; description = raw.description || "";
            } else if (source.type === "zoho") {
              title = raw["Job Title"] || raw.job_title; 
              url = raw["Application URL"] || raw.application_url;
              description = raw["Job Description"] || raw.job_description || "";
            } else if (source.type === "rss") {
              title = raw.title; url = raw.link; description = raw.description || "";
            }

            // 1. Surgical Sifting
            const tier = siftOpportunity(title, description, source.name, source.type);
            totalSifted++;

            if (tier === OpportunityTier.TRASH) continue;

            batch.push({
              id: uuidv4(),
              title,
              company: source.name,
              type: "direct",
              sourceUrl: url,
              sourcePlatform: source.type,
              tags: JSON.stringify([...source.tags, "ats-sniper"]),
              description: description.substring(0, 500),
              scrapedAt: now,
              createdAt: now,
              isActive: true,
              tier,
              latestActivityMs: now.getTime()
            });
          }

          if (batch.length > 0) {
            await db.insert(opportunitiesSchema)
              .values(batch)
              .onConflictDoUpdate({
                target: [opportunitiesSchema.title, opportunitiesSchema.company],
                set: { 
                  scrapedAt: now,
                  isActive: true,
                  tier: sql`excluded.tier`,
                  latestActivityMs: now.getTime()
                }
              });
            totalCaptured += batch.length;
            logger.info(`[sniper] Captured ${batch.length} signals for ${source.name}`);
          }

        } catch (err: any) {
          logger.error(`[sniper] Error targeting ${source.name}: ${err.message}`);
        }
      }

      logger.info(`[sniper] Audit Complete. Captured ${totalCaptured}/${totalSifted} signals.`);
      return { totalCaptured, totalSifted };
    } finally {
      client.close();
    }
  },
});
