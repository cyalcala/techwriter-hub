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
  { name: "ProBlogger", url: "https://problogger.com/jobs/feed/" },
];

async function test() {
  for (const source of SOURCES) {
    try {
      console.log(`📡 Fetching ${source.name}...`);
      const res = await fetch(source.url);
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      let matched = 0;
      for (const item of items) {
        const title = (item.title?.["#text"] || item.title || "").toLowerCase();
        const description = (item.description || item.content?.["#text"] || item.summary || "").toLowerCase();
        
        const isTechWriter = TECH_WRITER_KEYWORDS.some(kw => 
          title.includes(kw) || description.includes(kw)
        );
        
        if (isTechWriter) {
          matched++;
          console.log(`   🎯 Matched: ${title}`);
        }
      }
      console.log(`✅ ${source.name}: Found ${matched} tech writer jobs.`);
    } catch (e) {
      console.error(`❌ ${source.name} failed:`, e);
    }
  }
}

test();
