import { XMLParser } from "fast-xml-parser";
import { createDb } from "../../../packages/db/client";
import { opportunities } from "../../../packages/db/schema";
import { eq, sql } from "drizzle-orm";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const TECH_WRITER_KEYWORDS = [
  "technical writer",
  "technical writing",
  "documentation specialist",
  "api documentation",
  "technical author",
  "content engineer",
  "ux writer",
  "developer documentation",
  "documentation engineer"
];

const SOURCES = [
  { name: "Himalayas", url: "https://himalayas.app/jobs/rss" },
  { name: "We Work Remotely", url: "https://weworkremotely.com/remote-jobs.rss" },
  { name: "Remote OK", url: "https://remoteok.com/remote-jobs.rss" },
  { name: "ProBlogger", url: "https://problogger.com/jobs/feed/" },
];

export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    console.log("🚀 [SOVEREIGN] Starting TechWriter Pulse...");
    const { db } = createDb(env.DB);

    for (const source of SOURCES) {
      try {
        console.log(`📡 [HARVEST] Fetching ${source.name}...`);
        const response = await fetch(source.url);
        if (!response.ok) continue;

        const xml = await response.text();
        const parsed = parser.parse(xml);
        const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        for (const item of items) {
          const title = (item.title?.["#text"] || item.title || "").toLowerCase();
          const description = (item.description || "").toLowerCase();

          // 🎯 SURGICAL SIFTING: TechWriter Only
          const isTechWriter = TECH_WRITER_KEYWORDS.some(kw => 
            title.includes(kw) || description.includes(kw)
          );

          if (!isTechWriter) continue;

          // 🏺 BODEGA: Deduplication Logic (KV)
          const url = item.link?.["@_href"] || item.link || item.id;
          const md5_hash = btoa(url).slice(0, 32); // Simple edge-stable hash

          const existing = await env.BODEGA.get(`dedupe:${md5_hash}`);
          if (existing) continue;

          // 🍽️ PLATE: Deliver to D1
          console.log(`🍽️ [PLATE] Plating: ${item.title}`);
          await db.insert(opportunities).values({
            id: crypto.randomUUID(),
            md5_hash,
            title: item.title,
            company: item["dc:creator"] || item.author || "Unknown",
            url,
            description: item.description || "Technical Writing Role",
            niche: "TECHNICAL_WRITING",
            type: "remote",
            region: "Global", // Worldwide for Filipinos
            sourcePlatform: source.name,
            latestActivityMs: Date.now(),
          }).onConflictDoUpdate({
            target: opportunities.md5_hash,
            set: {
              lastSeenAt: sql`CURRENT_TIMESTAMP`,
              latestActivityMs: Date.now()
            }
          });

          // Cache in Bodega for 24h
          await env.BODEGA.put(`dedupe:${md5_hash}`, "true", { expirationTtl: 86400 });
        }
      } catch (err) {
        console.error(`❌ [SOVEREIGN] Failed to process ${source.name}:`, err);
      }
    }

    // Update Heartbeat in Bodega
    await env.BODEGA.put("pulse:last_harvest", Date.now().toString());
    console.log("✅ [SOVEREIGN] Pulse complete.");
  }
};
