import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, or, like } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Initiating Quality Strike: Purging low-intent signals...");
    
    // Purge based on the patterns the user identified
    const patterns = [
      '%onlyfans%',
      '%of chatter%',
      '%side hustle%',
      '%php a day%',
      '%earn money%',
      '%student looking%',
      '%ways to earn%',
      '%only USA%',
      '%USA only%'
    ];

    let totalPurged = 0;
    for (const pattern of patterns) {
      const result = await db.run(sql`
        DELETE FROM opportunities 
        WHERE (LOWER(title) LIKE ${pattern} OR LOWER(description) LIKE ${pattern})
      `);
      totalPurged += result.rowsAffected;
      console.log(`Purged ${result.rowsAffected} for pattern: ${pattern}`);
    }

    console.log(`Quality Strike Complete. Total signals purged: ${totalPurged}`);
  } catch (err) {
    console.error("Purge failed:", err);
  } finally {
    await client.close();
  }
}

main();
