import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";

async function run() {
  const res = await db.select({ title: opportunities.title, company: opportunities.company }).from(opportunities);
  console.log("Remaining 32 Jobs:");
  res.forEach((j, i) => {
    console.log(`${i+1}. ${j.title} | ${j.company}`);
  });
  process.exit(0);
}

run();
