import { createClient } from "@libsql/client";

async function checkDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing credentials");
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    const res = await client.execute("SELECT id, title, created_at, scraped_at, latest_activity_ms FROM opportunities LIMIT 5");
    console.log("Raw values from opportunities:");
    console.table(res.rows);
    
    const count = await client.execute("SELECT count(*) as c FROM opportunities");
    console.log("Total opportunities:", count.rows[0].c);

    const maxScraped = await client.execute("SELECT max(scraped_at) as m FROM opportunities");
    console.log("Max scraped_at:", maxScraped.rows[0].m);
    console.log("Current time (ms):", Date.now());
    console.log("Current time (sec):", Math.floor(Date.now() / 1000));

  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

checkDb();
