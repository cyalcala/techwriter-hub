import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    const res = await client.execute("SELECT title, scraped_at, tier FROM opportunities WHERE is_active = 1 ORDER BY tier ASC, scraped_at DESC LIMIT 50");
    console.log(JSON.stringify(res.rows, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
