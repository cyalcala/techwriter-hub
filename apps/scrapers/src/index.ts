import { XMLParser } from "fast-xml-parser";
import { createDb } from "../../../packages/db/client";
import { opportunities } from "../../../packages/db/schema";
import { eq, sql } from "drizzle-orm";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: {
    maxTotalExpansions: 1000000, // Massive headroom
  }
});

// Helper for deterministic hashing on Edge
async function getHash(str: string) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

const TECH_WRITER_KEYWORDS = [
  "technical writer", "technical writing", "documentation specialist", 
  "api documentation", "technical author", "content engineer", 
  "ux writer", "developer documentation", "documentation engineer",
  "technical editor", "knowledge base", "instructional designer",
  "documentation", "technical content", "writer", "editing", "authoring"
];

const SOURCES = [
  { name: "Himalayas", url: "https://himalayas.app/jobs/rss" },
  { name: "We Work Remotely", url: "https://weworkremotely.com/remote-jobs.rss" },
  { name: "Remote OK", url: "https://remoteok.com/remote-jobs.rss" },
  { name: "ProBlogger", url: "https://problogger.com/jobs/feed/" },
];

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
    console.log("🚀 [SOVEREIGN] Starting TechWriter Pulse...");
    const { db } = createDb(env.DB);

    for (const source of SOURCES) {
      try {
        console.log(`📡 [HARVEST] Fetching ${source.name}...`);
        const response = await fetch(source.url, {
          headers: { "User-Agent": "TechWriterHub-Sovereign-Scraper/1.0" }
        });
        if (!response.ok) continue;

        const xml = await response.text();
        const parsed = parser.parse(xml);
        const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        for (const item of items) {
          const rawTitle = item.title?.["#text"] || item.title || "";
          const title = String(rawTitle).toLowerCase();
          const rawDesc = item.description || item.content?.["#text"] || item.summary || "";
          const description = String(rawDesc).toLowerCase();

          // 🎯 SURGICAL SIFTING: TechWriter Only
          const isTechWriter = TECH_WRITER_KEYWORDS.some(kw => 
            title.includes(kw) || description.includes(kw)
          );

          if (!isTechWriter) {
            console.log(`⏭️ [SKIP] No match for: ${rawTitle}`);
            continue;
          }

          // 🏺 BODEGA: Deduplication Logic (KV)
          const url = item.link?.["@_href"] || item.link || item.id || item.guid?.["#text"] || item.guid;
          if (!url) continue;
          
          const md5_hash = await getHash(String(url));

          const existing = await env.BODEGA.get(`dedupe:${md5_hash}`);
          if (existing) continue;

          // 🍽️ PLATE: Deliver to D1
          console.log(`🍽️ [PLATE] Plating: ${rawTitle}`);
          
          try {
            await db.insert(opportunities).values({
              id: crypto.randomUUID(),
              md5_hash,
              title: String(rawTitle).slice(0, 255),
              company: item["dc:creator"] || item.author?.name || item.author || "Remote",
              url: String(url),
              description: String(rawDesc).slice(0, 1000), // Prevent massive text issues
              niche: "TECHNICAL_WRITING",
              type: "remote",
              region: "Global",
              source_platform: source.name,
              latest_activity_ms: Date.now(),
            }).onConflictDoUpdate({
              target: opportunities.md5_hash,
              set: {
                latest_activity_ms: Date.now()
              }
            });

            // Cache in Bodega for 24h
            await env.BODEGA.put(`dedupe:${md5_hash}`, "true", { expirationTtl: 86400 });
          } catch (dbErr) {
            console.error(`❌ [PLATE] DB Error for ${rawTitle}:`, dbErr);
          }
        }
      } catch (err) {
        console.error(`❌ [SOVEREIGN] Failed to process ${source.name}:`, err);
      }
    }

    await env.BODEGA.put("pulse:last_harvest", Date.now().toString());
    console.log("✅ [SOVEREIGN] Pulse complete.");
  }
};
