import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { desc } from "drizzle-orm";

async function verify() {
    const { db, client } = createDb();
    console.log("🔍 AUDITING PRODUCTION DATA FRESHNESS...");
    
    const latest = await db.select()
        .from(opportunities)
        .orderBy(desc(opportunities.lastSeenAt))
        .limit(5);

    if (latest.length === 0) {
        console.log("❌ NO OPPORTUNITIES FOUND.");
    } else {
        latest.forEach(job => {
            console.log(`[${job.lastSeenAt?.toISOString()}] ${job.title} @ ${job.company}`);
        });
    }

    client.close();
}

verify();
