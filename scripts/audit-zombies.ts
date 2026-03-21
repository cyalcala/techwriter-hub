import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    console.log("=== ZOMBIE AUDIT (New ScrapedAt, Old PostedAt) ===");
    const res = await client.execute(`
      SELECT title, company, 
             datetime(scraped_at, 'unixepoch') as scraped, 
             datetime(posted_at, 'unixepoch') as posted,
             (scraped_at - posted_at) / 3600 as ageHrs
      FROM opportunities 
      WHERE is_active = 1 
      ORDER BY scraped_at DESC, posted_at ASC 
      LIMIT 20
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
