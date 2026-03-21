import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function run() {
  try {
    const res = await client.execute("SELECT title, scraped_at, tier, is_active FROM opportunities WHERE title LIKE '%Sales Development Representative%' ORDER BY scraped_at DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    client.close();
  }
}
run();
