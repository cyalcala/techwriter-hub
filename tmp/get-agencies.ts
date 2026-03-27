import { createDb } from "../packages/db/client";
import { agencies } from "../packages/db/schema";

async function main() {
  const { db, client } = createDb();
  try {
    const allAgencies = await db.select().from(agencies);
    console.log(JSON.stringify(allAgencies.map(a => ({ name: a.name, hiringUrl: a.hiringUrl })), null, 2));
  } finally {
    await client.close();
  }
}

main();
