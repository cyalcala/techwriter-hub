import { createDb } from "./client";
import { schema } from "./schema";
import { sql } from "drizzle-orm";

async function auditDrift() {
    const { db, client } = createDb();
    console.log("══ Database Drift Audit ══");
    
    try {
        const stats = await db.select({ 
            maxCreated: sql<number>`max(created_at)`,
            now: sql<number>`unixepoch('now') * 1000`,
            rawNow: sql<number>`unixepoch('now')`
        }).from(schema.opportunities);
        
        const { maxCreated, now, rawNow } = stats[0];
        const driftMs = now - maxCreated;
        const driftMins = Math.round(driftMs / (1000 * 60));
        
        console.log(`Max Created: ${maxCreated} (${new Date(maxCreated).toISOString()})`);
        console.log(`System Now : ${now} (${new Date(now).toISOString()})`);
        console.log(`Raw Now    : ${rawNow}`);
        console.log(`Total Drift: ${driftMins} minutes`);

        if (driftMins > 45) {
            console.warn("⚠️  DRIFT BREACH DETECTED IN DATABASE.");
        } else {
            console.log("✅ Database is fresh.");
        }

    } catch (err: any) {
        console.error("🛑 Audit Failed:", err.message);
    } finally {
        await client.close();
    }
}

auditDrift();
