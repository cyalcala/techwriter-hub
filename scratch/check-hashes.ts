import { db } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.run(sql`SELECT length(md5_hash) as len, count(*) as count FROM opportunities GROUP BY len`);
  console.log("Hash Length Statistics:");
  res.rows.forEach(row => {
    console.log(`Length: ${row.len}, Count: ${row.count}`);
  });

  const samples = await db.run(sql`SELECT md5_hash FROM opportunities LIMIT 10`);
  console.log("\nSample Hashes:");
  samples.rows.forEach(row => {
    console.log(`- ${row.md5_hash}`);
  });

  process.exit(0);
}

run();
