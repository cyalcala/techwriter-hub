import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config();

async function audit() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("=== QUALITY AUDIT: LATEST 10 JOBS ===\n");

  const recent = await client.execute("SELECT title, company, niche, tier, relevance_score, region, source_platform, scraped_at, posted_at, md5_hash FROM opportunities WHERE is_active = 1 ORDER BY scraped_at DESC LIMIT 10");
  
  recent.rows.forEach((r, i) => {
    // Turso timestamps can be ISO strings or numbers (ms or s)
    let scrapedDate = 'N/A';
    if (r.scraped_at) {
        try {
            const val = typeof r.scraped_at === 'string' ? r.scraped_at : Number(r.scraped_at);
            scrapedDate = new Date(val).toISOString();
        } catch(e) {}
    }

    let postedDate = 'N/A';
    if (r.posted_at) {
        try {
            const val = typeof r.posted_at === 'string' ? r.posted_at : Number(r.posted_at);
            postedDate = new Date(val).toISOString();
        } catch(e) {}
    }

    console.log(`${i + 1}. [Tier ${r.tier}] [Score ${r.relevance_score}] ${r.title}`);
    console.log(`   Company: ${r.company} | Niche: ${r.niche} | Region: ${r.region}`);
    console.log(`   Source: ${r.source_platform} | Scraped: ${scrapedDate} | Posted: ${postedDate}`);
    console.log(`   Hash: ${r.md5_hash}`);
    console.log(`--------------------------------------------------------------------------------`);
  });

  client.close();
}

audit().catch(console.error);
