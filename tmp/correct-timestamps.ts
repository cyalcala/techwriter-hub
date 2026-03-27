import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Surgically correcting future-drifted timestamps...");
    
    // Reset all timestamps to current Unix epoch (ms)
    const now = Date.now();
    const result = await db.run(sql`
      UPDATE opportunities 
      SET created_at = ${now}, 
          scraped_at = ${now},
          latest_activity_ms = ${now}
      WHERE created_at > 2000000000000 -- Any date further than 2033
    `);
    
    console.log(`Correction complete. Affected signals: ${result.rowsAffected}`);
  } finally {
    await client.close();
  }
}

main();
