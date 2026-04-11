import { db } from "../packages/db";
import { vitals } from "../packages/db/schema";

async function check() {
  const all = await db.select().from(vitals);
  console.log(JSON.stringify(all, null, 2));
}

check().catch(console.error);
