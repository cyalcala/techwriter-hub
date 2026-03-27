import { createDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const res = await db.run(sql`SELECT created_at, typeof(created_at) as type FROM opportunities LIMIT 1`);
    console.log("Raw createdAt sample:", res.rows[0].created_at, "(Type: " + res.rows[0].type + ")");
  } finally {
    await client.close();
  }
}

main();
