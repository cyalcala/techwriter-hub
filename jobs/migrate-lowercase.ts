import { createDb } from "@va-hub/db/client";
import { sql } from "drizzle-orm";

async function migrate() {
  const { db, client } = createDb();
  try {
    console.log("🚀 Starting Lowercase Migration...");
    const result = await db.run(sql`
      UPDATE opportunities 
      SET title = LOWER(trim(title)), 
          company = LOWER(trim(company))
    `);
    console.log(`✅ Migration Complete. Rows updated: ${result.rowsAffected}`);
  } finally {
    client.close();
  }
}

migrate().catch(console.error);
