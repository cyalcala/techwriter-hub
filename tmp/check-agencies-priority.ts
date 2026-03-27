import { createDb } from "../packages/db/client";
import { agencies } from "../packages/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    const res = await db.select().from(agencies).orderBy(desc(agencies.hiringHeat));
    console.log("Top 10 Agencies by Heat:", JSON.stringify(res.slice(0, 10).map(a => ({ name: a.name, heat: a.hiringHeat })), null, 2));
  } finally {
    await client.close();
  }
}

main();
