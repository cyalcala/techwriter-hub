import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Surgically resetting all timestamps to the 2026 epoch...");
    const now = Date.now();
    
    // Purge everything that is not a valid 13-digit timestamp (milliseconds)
    // or just reset EVERYTHING to be safe and start fresh signals.
    const result = await db.run(sql`
      UPDATE opportunities 
      SET created_at = ${now}, 
          scraped_at = ${now}, 
          latest_activity_ms = ${now}
      WHERE typeof(created_at) = 'text' OR created_at > 2000000000000
    `);

    console.log(`Titanium Reset Complete. Affected: ${result.rowsAffected} signals.`);
  } finally {
    await client.close();
  }
}

main();
