import { createDb } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { sql } from "drizzle-orm";

async function migrate() {
    const { db, client } = createDb();
    try {
        console.log("Migrating timestamps: 10-digit (s) -> 13-digit (ms)...");
        
        // Update scraped_at if it's 10 digits
        const r1 = await db.run(sql`
            UPDATE opportunities 
            SET scraped_at = scraped_at * 1000 
            WHERE scraped_at > 0 AND scraped_at < 10000000000
        `);
        console.log("Migrated scraped_at:", r1.rowsAffected);

        // Update posted_at if it's 10 digits
        const r2 = await db.run(sql`
            UPDATE opportunities 
            SET posted_at = posted_at * 1000 
            WHERE posted_at > 0 AND posted_at < 10000000000
        `);
        console.log("Migrated posted_at:", r2.rowsAffected);

        // Update created_at if it's 10 digits
        const r3 = await db.run(sql`
            UPDATE opportunities 
            SET created_at = created_at * 1000 
            WHERE created_at > 0 AND created_at < 10000000000
        `);
        console.log("Migrated created_at:", r3.rowsAffected);

        console.log("Migration complete. ✅");
    } finally {
        client.close();
    }
}

migrate();
function OpportunityTier(result: any): string | undefined {
    throw new Error("Function not implemented.");
}
