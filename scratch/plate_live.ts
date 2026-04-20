import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: {
    enabled: true,
    maxTotalExpansions: 1000000,
  }
});

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
];

async function getHash(str: string) {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

async function start() {
  const allMatched = [];
  
  for (const source of SOURCES) {
    try {
      console.log(`📡 Fetching ${source.name}...`);
      const res = await fetch(source.url);
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      for (const item of items) {
        const title = (item.title?.["#text"] || item.title || "").toString();
        const description = (item.description || item.content?.["#text"] || item.summary || "").toString();
        const url = (item.link?.["@_href"] || item.link || item.id || item.guid?.["#text"] || item.guid || "").toString();
        
        const isMatched = TECH_WRITER_KEYWORDS.some(kw => 
          title.toLowerCase().includes(kw) || description.toLowerCase().includes(kw)
        );
        
        if (isMatched && url) {
          allMatched.push({
            id: crypto.randomUUID(),
            md5_hash: await getHash(url),
            title: title.replace(/'/g, "''").slice(0, 255),
            company: (item["dc:creator"] || item.author?.name || item.author || "Remote").replace(/'/g, "''"),
            url: url.replace(/'/g, "''"),
            description: description.replace(/'/g, "''").slice(0, 1000),
            niche: "TECHNICAL_WRITING",
            source_platform: source.name,
            latest_activity_ms: Date.now()
          });
        }
      }
    } catch (e) {
      console.error(`❌ ${source.name} failed:`, e);
    }
  }

  console.log(`✨ Found ${allMatched.length} signals. Preparing plating...`);
  
  for (const job of allMatched.slice(0, 15)) { // Plating top 15
    const cmd = `INSERT OR IGNORE INTO opportunities (id, md5_hash, title, company, url, description, niche, source_platform, latest_activity_ms) VALUES ('${job.id}', '${job.md5_hash}', '${job.title}', '${job.company}', '${job.url}', '${job.description}', '${job.niche}', '${job.source_platform}', ${job.latest_activity_ms});`;
    
    const { execSync } = await import('child_process');
    try {
      execSync(`npx wrangler d1 execute techwriter-db --command "${cmd}" --remote --cwd apps/scrapers`, { stdio: 'inherit' });
      console.log(`✅ Plated: ${job.title}`);
    } catch (e) {
      console.error(`❌ Failed to plate: ${job.title}`);
    }
  }
}

start();
