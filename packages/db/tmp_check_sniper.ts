import { createDb } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { like, count } from "drizzle-orm";

async function check() {
    const { db, client } = createDb();
    try {
        const result = await db.select({ value: count() }).from(opportunities).where(like(opportunities.tags, "%ats-sniper%"));
        console.log("ATS SNIPER CAPTURED JOBS:", result[0].value);
        
        const latest = await db.select().from(opportunities).where(like(opportunities.tags, "%ats-sniper%")).limit(5);
        console.log("LATEST SNIPER JOBS:", JSON.stringify(latest, null, 2));
    } finally {
        client.close();
    }
}

check();
