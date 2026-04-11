import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config();

async function auditPlated() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("=== AUDIT: PLATED JOBS (GOLD VAULT) ===\n");

  const recentPlated = await client.execute({
    sql: "SELECT title, company, niche, tier, relevance_score, source_platform, scraped_at FROM opportunities WHERE source_platform LIKE 'Trigger Sifter%' ORDER BY scraped_at DESC LIMIT 10",
    args: []
  });
  
  recentPlated.rows.forEach((r, i) => {
    console.log(`${i + 1}. [Tier ${r.tier}] [Score ${r.relevance_score}] ${r.title}`);
    console.log(`   Company: ${r.company} | Niche: ${r.niche}`);
    console.log(`   Source: ${r.source_platform} | Scraped: ${new Date(Number(r.scraped_at)).toISOString()}`);
    console.log(`--------------------------------------------------------------------------------`);
  });

  client.close();
}

auditPlated().catch(console.error);
