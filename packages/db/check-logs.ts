import { createDb } from "./client";
import { logs as logsTable } from "./schema";
import { desc } from "drizzle-orm";

async function checkLogs() {
  const { db, client } = createDb();
  console.log("══ Checking System Logs (logs) ══");
  try {
    const logs = await db.select()
      .from(logsTable)
      .orderBy(desc(logsTable.timestamp))
      .limit(30);

    if (logs.length === 0) {
      console.log("No logs found.");
    }

    logs.forEach(log => {
      const ts = log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString();
      console.log(`[${ts}] ${log.level.toUpperCase()}: ${log.message}`);
      if (log.metadata && log.metadata !== '{}') {
          console.log(`  Meta: ${log.metadata}`);
      }
    });

  } catch (err: any) {
    console.error("🛑 Log Check Failed:", err.message);
  } finally {
    await client.close();
  }
}

checkLogs();
