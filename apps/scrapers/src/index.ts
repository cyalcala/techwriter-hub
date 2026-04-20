import { XMLParser } from "fast-xml-parser";
import { createDb } from "../../../packages/db/client";
import { opportunities } from "../../../packages/db/schema";
import { eq, sql } from "drizzle-orm";
import { config } from "@va-hub/config";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: {
    enabled: true,
    maxTotalExpansions: 1000000, 
  }
});

// Helper for deterministic hashing on Edge
async function getHash(str: string) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/__scheduled") {
      await this.scheduled({} as any, env, ctx);
      return new Response("Pulse Triggered", { status: 200 });
    }
    if (url.pathname === "/__debug_count") {
      const { db } = createDb(env.DB);
      const count = await db.select({ value: sql`count(*)` }).from(opportunities);
      return new Response(JSON.stringify(count), { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    console.log(`🚀 [SCALING] Starting ${config.name} Pulse...`);
    const { db } = createDb(env.DB);

    // 📡 HARVEST: RSS Sources
    for (const source of config.rss_sources) {
      try {
        console.log(`📡 [HARVEST] Fetching ${source.name}...`);
        const response = await fetch(source.url, {
          headers: { "User-Agent": "TechWriterHub-Sovereign-Scraper/1.0" }
        });
        if (!response.ok) continue;

        const xml = await response.text();
        const parsed = parser.parse(xml);
        const channel = parsed?.rss?.channel ?? parsed?.feed;
        const rawItems = channel?.item ?? channel?.entry ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        for (const item of items) {
          const rawTitle = item.title?.["#text"] || item.title || "";
          const title = String(rawTitle).toLowerCase();
          const rawDesc = item.description || item.content?.["#text"] || item.summary || "";
          const description = String(rawDesc).toLowerCase();

          // 🎯 SURGICAL SIFTING: Technical Writer Targets
          const titleMatch = config.target_signals.role.some(kw => title.includes(kw));
          const descriptionMatches = config.target_signals.role.filter(kw => description.includes(kw)).length;
          const isIrrelevant = config.kill_lists.titles.some(kw => title.includes(kw));

          const passes = (titleMatch || descriptionMatches >= 2) && !isIrrelevant;
          if (!passes) continue;

          // 🏺 BODEGA: Deduplication Logic (KV)
          const url = item.link?.["@_href"] || item.link || item.id || item.guid?.["#text"] || item.guid;
          if (!url) continue;
          
          const md5_hash = await getHash(String(url));
          const existing = await env.BODEGA.get(`dedupe:${md5_hash}`);
          if (existing) continue;

          // 🍽️ PLATE: Deliver to D1
          console.log(`🍽️ [PLATE] Plating: ${rawTitle}`);
          
          // Region Detection
          let detectedRegion = (source as any).region || "Global";
          const phKeywords = ["philippines", "manila", "cebu", "davao", "makati", "bgc", "quezon city", "taguig", "pasig"];
          if (phKeywords.some(kw => title.includes(kw) || description.includes(kw))) {
            detectedRegion = "Philippines";
          }

          try {
            await db.insert(opportunities).values({
              id: crypto.randomUUID(),
              md5_hash,
              title: String(rawTitle).slice(0, 255),
              company: item["dc:creator"] || item.author?.name || item.author || "Remote",
              url: String(url),
              description: String(rawDesc).slice(0, 1000),
              niche: config.primary_niche as any,
              type: "remote",
              region: detectedRegion,
              sourcePlatform: source.platform,
              latestActivityMs: Date.now(),
              isActive: true,
              tier: titleMatch ? 1 : 2,
            }).onConflictDoUpdate({
              target: opportunities.md5_hash,
              set: { latestActivityMs: Date.now() }
            });

            await env.BODEGA.put(`dedupe:${md5_hash}`, "true", { expirationTtl: 86400 });
          } catch (dbErr) {
            console.error(`❌ [PLATE] DB Error for ${rawTitle}:`, dbErr);
          }
        }
      } catch (err) {
        console.error(`❌ [ERROR] Failed RSS ${source.name}:`, err);
      }
    }

    // 📡 HARVEST: JSON Sources (JobStreet, etc.)
    for (const source of config.json_sources) {
      try {
        console.log(`📡 [HARVEST] Fetching JSON ${source.name}...`);
        const response = await fetch(source.url, {
          headers: { 
            "User-Agent": "VA-Hub-Harvester/3.0 (Ethical Career Pulse; filipino-freelancer-support; +https://techwriter-hub.pages.dev/ethics)",
            "Accept": "application/json"
          }
        });
        if (!response.ok) continue;

        const data: any = await response.json();
        let items = [];

        if (source.json_type === "JobStreet") {
          // Supports both Chalice v4 and legacy structures
          items = data?.results || data?.jobs || data?.data || [];
        }

        for (const item of items) {
          const rawTitle = item.title || item.jobTitle || "";
          const title = String(rawTitle).toLowerCase();
          const rawDesc = item.teaser || item.description || "";
          const description = String(rawDesc).toLowerCase();

          // 🎯 SURGICAL SIFTING
          const titleMatch = config.target_signals.role.some(kw => title.includes(kw));
          const descriptionMatches = config.target_signals.role.filter(kw => description.includes(kw)).length;
          const isIrrelevant = config.kill_lists.titles.some(kw => title.includes(kw));

          const passes = (titleMatch || descriptionMatches >= 2) && !isIrrelevant;
          if (!passes) continue;

          // JobStreet jobId or direct URL
          const jobId = item.id || item.jobId;
          const url = item.jobUrl || (jobId ? `https://www.jobstreet.com.ph/en/job/${jobId}` : null);
          if (!url) continue;

          const md5_hash = await getHash(String(url));
          const existing = await env.BODEGA.get(`dedupe:${md5_hash}`);
          if (existing) continue;

          console.log(`🍽️ [PLATE] Plating JSON: ${rawTitle}`);

          try {
            await db.insert(opportunities).values({
              id: crypto.randomUUID(),
              md5_hash,
              title: String(rawTitle).slice(0, 255),
              company: item.advertiser?.description || item.companyName || item.company || "Remote",
              url: String(url),
              description: String(rawDesc).slice(0, 1000),
              niche: config.primary_niche as any,
              type: "remote",
              region: (source as any).region || "Global",
              sourcePlatform: source.platform,
              latestActivityMs: Date.now(),
              isActive: true,
              tier: titleMatch ? 1 : 2,
            }).onConflictDoUpdate({
              target: opportunities.md5_hash,
              set: { latestActivityMs: Date.now() }
            });

            await env.BODEGA.put(`dedupe:${md5_hash}`, "true", { expirationTtl: 86400 });
          } catch (dbErr) {
            console.error(`❌ [PLATE] DB Error for ${rawTitle}:`, dbErr);
          }
        }
      } catch (err) {
        console.error(`❌ [ERROR] Failed JSON ${source.name}:`, err);
      }
    }

    await env.BODEGA.put("pulse:last_harvest", Date.now().toString());
    console.log("✅ [COMPLETE] Pulse finished.");
  }
};
