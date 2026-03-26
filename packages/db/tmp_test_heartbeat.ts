import { createDb } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

async function test() {
    const { db, client } = createDb();
    try {
        console.log("Testing write with Milliseconds...");
        const id = uuidv4();
        const now = new Date();
        
        await db.insert(opportunities).values({
            id,
            title: "TEST_HEARTBEAT_" + now.getTime(),
            company: "TRigger.dev Verification Agent",
            sourceUrl: "https://va-freelance-hub-web.vercel.app/test",
            scrapedAt: now,
            isActive: 1,
            tier: 1,
            latestActivityMs: now.getTime()
        });

        console.log("SUCCESS. Verifying...");
        const row = await db.select().from(opportunities).where(eq(opportunities.id, id));
        console.log("Row in DB:", JSON.stringify(row, null, 2));
    } finally {
        client.close();
    }
}

test();
