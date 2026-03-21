import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  try {
    const health = await client.execute("SELECT * FROM system_health");
    console.log("=== system_health ===");
    console.table(health.rows);

    const newest = await client.execute("SELECT title, scraped_at, is_active FROM opportunities ORDER BY scraped_at DESC LIMIT 5");
    console.log("\n=== newest opportunities ===");
    console.table(newest.rows);
  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

check();
