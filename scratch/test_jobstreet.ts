import { config } from "../packages/config";

async function testJobStreet() {
  const source = config.json_sources.find(s => s.id === "jobstreet-ph-techwriter");
  if (!source) {
    console.error("JobStreet source not found in config");
    return;
  }

  console.log(`📡 Fetching ${source.name}...`);
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "TechWriterHub-Sovereign-Scraper/1.0" }
    });
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status}`);
      return;
    }

    const data: any = await response.json();
    const items = data?.jobs || [];
    
    console.log(`✅ Found ${items.length} raw jobs.`);
    
    let matched = 0;
    for (const item of items) {
      const title = String(item.title || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();

      const titleMatch = config.target_signals.role.some(kw => title.includes(kw));
      const descriptionMatches = config.target_signals.role.filter(kw => description.includes(kw)).length;
      const isIrrelevant = config.kill_lists.titles.some(kw => title.includes(kw));

      const passes = (titleMatch || descriptionMatches >= 2) && !isIrrelevant;
      
      if (passes) {
        matched++;
        console.log(`   🎯 Matched: ${item.title} at ${item.companyName}`);
      } else {
        // console.log(`   ⏭️ Skipped: ${item.title}`);
      }
    }
    
    console.log(`✨ Matched ${matched} signals.`);
  } catch (err) {
    console.error(`❌ Error:`, err);
  }
}

testJobStreet();
