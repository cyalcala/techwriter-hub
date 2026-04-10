import { db } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.run(sql`SELECT niche, count(*) as count FROM opportunities GROUP BY niche`);
  console.log("Niche Distribution:");
  res.rows.forEach(row => {
    console.log(`${row.niche}: ${row.count}`);
  });
  process.exit(0);
}

run();
