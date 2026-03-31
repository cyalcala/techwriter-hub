import { createDb } from "./client";
import { noteslog } from "./schema";
import { desc } from "drizzle-orm";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function checkNoteslog() {
  const { db, client } = createDb();
  console.log("══ Checking Silent Ledger (noteslog) ══");
  try {
    const logs = await db.select()
      .from(noteslog)
      .orderBy(desc(noteslog.timestamp))
      .limit(10);

    if (logs.length === 0) {
      console.log("No logs found in noteslog.");
    }

    logs.forEach(log => {
      console.log(`[${log.timestamp.toISOString()}] Drift: ${log.driftMinutes}m | Status: ${log.status} | Actions: ${log.actionsTaken}`);
      if (log.metadata) {
          try {
              const meta = JSON.parse(log.metadata as string);
              if (meta.criticalError) console.error(`  Error: ${meta.criticalError}`);
          } catch (e) {}
      }
    });

  } catch (err: any) {
    console.error("Failed to check noteslog:", err.message);
  } finally {
    await client.close();
  }
}

checkNoteslog();
