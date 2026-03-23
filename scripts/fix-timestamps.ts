import { createClient } from "@libsql/client";

async function fixTimestamps() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing credentials");
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    console.log("Starting timestamp migration (seconds -> milliseconds)...");
    
    // Identify rows where scraped_at is in seconds (10 digits)
    const res = await client.execute(`
      UPDATE opportunities 
      SET 
        scraped_at = scraped_at * 1000,
        created_at = CASE WHEN created_at < 10000000000 THEN created_at * 1000 ELSE created_at END
      WHERE scraped_at < 10000000000
    `);
    
    console.log(`Updated ${res.rowsAffected} rows.`);

    // Also update system_health if needed
    const healthRes = await client.execute(`
      UPDATE system_health
      SET 
        last_success = CASE WHEN last_success < 10000000000 THEN last_success * 1000 ELSE last_success END,
        updated_at = CASE WHEN updated_at < 10000000000 THEN updated_at * 1000 ELSE updated_at END
      WHERE last_success < 10000000000 OR updated_at < 10000000000
    `);
    console.log(`Updated ${healthRes.rowsAffected} health records.`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.close();
  }
}

fixTimestamps();
