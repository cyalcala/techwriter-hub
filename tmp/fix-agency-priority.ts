import { createDb } from "../packages/db/client";
import { agencies } from "../packages/db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Boosting Pearl Talent and Outsource Angel visibility...");
    const result = await db.update(agencies)
      .set({ 
        frictionLevel: 1, 
        hiringHeat: 3,
        status: 'active'
      })
      .where(or(
        eq(agencies.name, 'Pearl Talent'),
        eq(agencies.name, 'Outsource Angel')
      ));
    
    console.log(`Boost complete. Affected: ${result.rowsAffected} agencies.`);
  } finally {
    await client.close();
  }
}

main();
