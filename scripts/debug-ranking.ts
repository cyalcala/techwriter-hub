import { createDb } from "../jobs/lib/db";
import { opportunities } from "../packages/db/schema";
import { asc, desc, eq, not, sql } from "drizzle-orm";

async function run() {
  const db = await createDb();
  const now = Date.now();
  console.log(`Current Time (now): ${now} (${new Date(now).toISOString()})`);

  const res = await db.select({
    title: opportunities.title,
    tier: opportunities.tier,
    latestActivityMs: opportunities.latestActivityMs,
    scrapedAt: opportunities.scrapedAt,
    postedAt: opportunities.postedAt,
    score: sql`
      (tier + 
        CASE 
          WHEN (${now} - latest_activity_ms) <= 900000 THEN -5.0 
          ELSE ((${now} - latest_activity_ms) / 43200000.0) 
        END
      )
    `
  }).from(opportunities)
    .where(not(eq(opportunities.tier, 4)))
    .orderBy(
      sql`
        (tier + 
          CASE 
            WHEN (${now} - latest_activity_ms) <= 900000 THEN -5.0 
            ELSE ((${now} - latest_activity_ms) / 43200000.0) 
          END
        ) ASC
      `,
      desc(opportunities.latestActivityMs)
    ).limit(30);

  console.table(res);
}
run();
