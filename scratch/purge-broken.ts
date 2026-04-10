import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { like, or } from "drizzle-orm";

async function run() {
  const res = await db.delete(opportunities).where(
    or(
      like(opportunities.title, "<!DOCTYPE%"),
      like(opportunities.title, "<html%"),
      like(opportunities.title, "<%"), // Any HTML tag start
    )
  );
  console.log(`🧹 Purged ${res.rowsAffected} broken HTML-title jobs.`);
  process.exit(0);
}

run();
