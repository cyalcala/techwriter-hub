import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { sql, desc } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const res = await db.select({
      id: opportunities.id,
      title: opportunities.title,
      createdAt: opportunities.createdAt,
      scrapedAt: opportunities.scrapedAt
    })
    .from(opportunities)
    .orderBy(desc(opportunities.createdAt))
    .limit(5);

    console.log("Latest 5 records (by createdAt):", JSON.stringify(res, null, 2));

    const countNew = await db.run(sql`
      SELECT COUNT(*) as count 
      FROM opportunities 
      WHERE created_at > (strftime('%s', 'now') - 86400) * 1000
    `);
    console.log("Count of 'New Today' (last 24h):", countNew.rows[0].count);

  } finally {
    await client.close();
  }
}

main();
