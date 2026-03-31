import { createDb } from "../packages/db/client";
import { noteslog } from "../packages/db/schema";
import { desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { db, client } = createDb();
  
  try {
    const logs = await db.select().from(noteslog).orderBy(desc(noteslog.timestamp)).limit(20);
    console.log("📝 SYSTEM NOTESLOG (Last 20 entries):");
    logs.forEach(log => {
      console.log(`[${log.timestamp?.toISOString()}] [${log.status}] Drift: ${log.driftMinutes}m Actions: ${log.actionsTaken}`);
      if (log.metadata) console.log(`   Metadata: ${JSON.stringify(log.metadata)}`);
    });
  } catch (error) {
    console.error("🔴 Audit failed:", error);
  } finally {
    client.close();
  }
}

main();
