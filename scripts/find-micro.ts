import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { like, or } from "drizzle-orm";

async function findMicro() {
  // Exhaustive search across ALL items (title or company)
  const res = await db.select().from(opportunities).where(
    or(
      like(opportunities.company, "%micro%"),
      like(opportunities.title, "%micro%")
    )
  );
  console.log("🔍 EXHAUSTIVE TITLE/COMPANY SEARCH RESULTS FOR 'MICRO':");
  if (res.length === 0) {
    console.log("No records found containing 'micro' in title or company name.");
  } else {
    console.log(JSON.stringify(res, null, 2));
  }
}

findMicro().catch(console.error);
