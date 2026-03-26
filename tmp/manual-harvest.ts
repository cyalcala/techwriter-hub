/**
 * SELF-CONTAINED ATS + RSS HARVEST
 * Bypasses workspace aliases and Trigger.dev SDK entirely.
 */
import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from '../packages/db/schema';
const uuidv4 = () => crypto.randomUUID();
import { XMLParser } from 'fast-xml-parser';
import { siftOpportunity, OpportunityTier } from '../jobs/lib/sifter';
import { atsSources } from '../packages/config/ats-sources';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

// === RSS SOURCES ===
const rssSources = [
  { name: "Himalayas", url: "https://himalayas.app/jobs/rss", platform: "Himalayas" },
  { name: "We Work Remotely", url: "https://weworkremotely.com/remote-jobs.rss", platform: "WeWorkRemotely" },
  { name: "Remote OK", url: "https://remoteok.com/remote-jobs.rss", platform: "RemoteOK" },
  { name: "ProBlogger", url: "https://problogger.com/jobs/feed/", platform: "ProBlogger" },
  { name: "Jobspresso", url: "https://jobspresso.co/category/marketing-customer-support/feed/", platform: "Jobspresso" },
];

function stripHtml(s: string | undefined) {
  return s?.replace(/<[^>]*>/g, "").trim() ?? "";
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, htmlEntities: true });

async function harvestRSS() {
  console.log("═══ RSS HARVEST ═══");
  let total = 0;
  const now = new Date();

  for (const src of rssSources) {
    try {
      const res = await fetch(`${src.url}${src.url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester)", "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) { console.log(`  ❌ ${src.name}: HTTP ${res.status}`); continue; }
      
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const channel = parsed?.rss?.channel ?? parsed?.feed;
      const rawItems = channel?.item ?? channel?.entry ?? [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      const batch: any[] = [];
      for (const item of items) {
        const title = stripHtml(typeof item.title === "string" ? item.title : item.title?.["#text"] ?? "");
        const link = typeof item.link === "string" ? item.link : (item.link?.["@_href"] ?? item.id ?? "");
        if (!title || !link) continue;
        
        const tier = siftOpportunity(title, stripHtml(item.description ?? ""), stripHtml(item["dc:creator"] ?? item.author ?? "") || "Generic", src.platform);
        if (tier === OpportunityTier.TRASH) continue;
        
        const postedAt = item.pubDate || item.published || item.updated || item["dc:date"];
        const postTime = postedAt ? new Date(postedAt) : now;
        
        batch.push({
          id: uuidv4(),
          title: title.trim(),
          company: stripHtml(item["dc:creator"] ?? item.author ?? "") || "Generic",
          type: "full-time",
          sourceUrl: link.trim(),
          sourcePlatform: src.platform,
          tags: JSON.stringify([]),
          description: stripHtml(item.description ?? "").slice(0, 500) || null,
          postedAt: postTime,
          scrapedAt: now,
          isActive: true,
          tier,
          latestActivityMs: Math.max(postTime.getTime(), now.getTime()),
          createdAt: now,
        });
      }
      
      if (batch.length > 0) {
        for (let i = 0; i < batch.length; i += 50) {
          const chunk = batch.slice(i, i + 50);
          await db.insert(schema.opportunities).values(chunk).onConflictDoUpdate({
            target: [schema.opportunities.title, schema.opportunities.company],
            set: { scrapedAt: now, isActive: true, tier: sql`excluded.tier`, latestActivityMs: sql`excluded.latest_activity_ms` }
          });
        }
        total += batch.length;
        console.log(`  ✅ ${src.name}: ${batch.length} signals captured`);
      } else {
        console.log(`  ⚠️ ${src.name}: 0 signals after sifting (${items.length} raw)`);
      }
    } catch (err: any) {
      console.log(`  ❌ ${src.name}: ${err.message}`);
    }
  }
  return total;
}

async function harvestATS() {
  console.log("\n═══ ATS SNIPER ═══");
  let total = 0;
  const now = new Date();

  for (const source of atsSources) {
    try {
      let rawJobs: any[] = [];
      if (source.type === "greenhouse") {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${source.token}/jobs`);
        const data = await res.json();
        rawJobs = data.jobs || [];
      } else if (source.type === "lever") {
        const res = await fetch(`https://api.lever.co/v0/postings/${source.token}?mode=json`);
        rawJobs = await res.json();
      } else if (source.type === "rss") {
        const res = await fetch(source.token, { signal: AbortSignal.timeout(12000) });
        const xml = await res.text();
        const data = parser.parse(xml);
        const items = data.rss?.channel?.item || [];
        rawJobs = Array.isArray(items) ? items : [items];
      }
      
      if (rawJobs.length === 0) { console.log(`  ⚠️ ${source.name}: 0 raw jobs`); continue; }
      
      const batch: any[] = [];
      for (const raw of rawJobs) {
        let title = "", url = "", description = "";
        if (source.type === "greenhouse") { title = raw.title; url = raw.absolute_url; description = raw.content || ""; }
        else if (source.type === "lever") { title = raw.text; url = raw.hostedUrl; description = raw.description || ""; }
        else if (source.type === "rss") { title = raw.title; url = raw.link; description = raw.description || ""; }
        
        const tier = siftOpportunity(title, description, source.name, source.type);
        if (tier === OpportunityTier.TRASH) continue;
        
        batch.push({
          id: uuidv4(), title, company: source.name, type: "direct", sourceUrl: url,
          sourcePlatform: source.type === "rss" ? "rss" : source.type.charAt(0).toUpperCase() + source.type.slice(1),
          tags: JSON.stringify([...source.tags, "ats-sniper"]),
          description: stripHtml(description).substring(0, 500),
          scrapedAt: now, createdAt: now, isActive: true, tier,
          latestActivityMs: now.getTime(),
        });
      }
      
      if (batch.length > 0) {
        await db.insert(schema.opportunities).values(batch).onConflictDoUpdate({
          target: [schema.opportunities.title, schema.opportunities.company],
          set: { scrapedAt: now, isActive: true, tier: sql`excluded.tier`, latestActivityMs: now.getTime() }
        });
        total += batch.length;
        console.log(`  ✅ ${source.name}: ${batch.length}/${rawJobs.length} captured`);
      } else {
        console.log(`  ⚠️ ${source.name}: 0/${rawJobs.length} after sift`);
      }
    } catch (err: any) {
      console.log(`  ❌ ${source.name}: ${err.message}`);
    }
  }
  return total;
}

async function main() {
  console.log("🚀 FULL LOCAL HARVEST\n");
  const rss = await harvestRSS();
  const ats = await harvestATS();
  
  const stats = await client.execute('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active=1 THEN 1 END) as active FROM opportunities WHERE tier != 4');
  console.log(`\n📊 FINAL STATS: RSS=${rss} ATS=${ats} | DB: ${JSON.stringify(stats.rows[0])}`);
  client.close();
}

main().catch(e => { console.error("FATAL:", e); client.close(); });
