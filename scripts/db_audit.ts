import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function audit() {
  try {
    const total = await client.execute("SELECT COUNT(*) as cnt FROM opportunities");
    const active = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE is_active = 1");
    const gold = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 1 AND is_active = 1");
    const silver = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 2 AND is_active = 1");
    const bronze = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 3 AND is_active = 1");
    const trash = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE tier = 4");

    console.log("=== DB AUDIT ===");
    console.log(`Total Opportunities: ${total.rows[0].cnt}`);
    console.log(`Active: ${active.rows[0].cnt}`);
    console.log(`  Gold: ${gold.rows[0].cnt}`);
    console.log(`  Silver: ${silver.rows[0].cnt}`);
    console.log(`  Bronze: ${bronze.rows[0].cnt}`);
    console.log(`Trash (Tier 4): ${trash.rows[0].cnt}`);

    const newest = await client.execute("SELECT title, scraped_at, is_active FROM opportunities ORDER BY scraped_at DESC LIMIT 5");
    console.log("\n=== Newest Opportunities ===");
    console.table(newest.rows);
    
    const newestActive = await client.execute("SELECT title, scraped_at, is_active FROM opportunities WHERE is_active = 1 ORDER BY scraped_at DESC LIMIT 5");
    console.log("\n=== Newest Active Opportunities ===");
    console.table(newestActive.rows);
  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

audit();
