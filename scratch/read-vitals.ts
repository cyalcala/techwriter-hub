import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";

async function run() {
  const res = await db.select().from(vitals);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run();
