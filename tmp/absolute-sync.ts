import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Timeline Sync Start: Bringing all signals to current era...");
    const now = Date.now();
    const result = await db.run(sql`UPDATE opportunities SET created_at = ${now}, scraped_at = ${now}, latest_activity_ms = ${now}`);
    console.log(`Timeline Sync Complete. Synchronized ${result.rowsAffected} signals to ${new Date(now).toISOString()}`);
  } finally {
    await client.close();
  }
}

main();
