import { createDb, systemHealth } from "../jobs/lib/db";
import { desc } from "drizzle-orm";

async function checkHealth() {
  const db = await createDb();
  const reports = await db.select().from(systemHealth).orderBy(desc(systemHealth.updatedAt));
  console.log(JSON.stringify(reports, null, 2));
  process.exit(0);
}

checkHealth();
