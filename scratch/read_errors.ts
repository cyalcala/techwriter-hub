import { db, schema } from "../packages/db";
import { desc, eq } from "drizzle-orm";

async function main() {
  const logs = await db
    .select()
    .from(schema.logs)
    .where(eq(schema.logs.level, "error"))
    .orderBy(desc(schema.logs.timestamp))
    .limit(25);

  console.log(`\n📋 Last ${logs.length} kitchen errors:\n`);
  logs.forEach((l, i) => {
    const ts = l.timestamp ? new Date(l.timestamp).toISOString() : "unknown";
    const msg = l.message?.slice(0, 200) ?? "(no message)";
    console.log(`[${i + 1}] ${ts}\n    ${msg}\n`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
