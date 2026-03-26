import { createDb } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { sql } from "drizzle-orm";

async function verify() {
    const { db, client } = createDb();
    try {
        console.log("Checking for Platinum Signals...");
        const platinum = await db.select().from(opportunities).where(sql`tier = 0`).limit(5);
        console.log(`Found ${platinum.length} Platinum signals.`);
        platinum.forEach(p => {
            console.log(`- ${p.title} @ ${p.company} [Tags: ${p.tags}]`);
        });
    } finally {
        client.close();
    }
}

verify();
