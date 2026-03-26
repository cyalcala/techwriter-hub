import { createDb } from "./packages/db/client";
import { opportunities } from "./packages/db/schema";
import { sql } from "drizzle-orm";

async function audit() {
    const { db, client } = createDb();
    try {
        console.log("🍉 WATERMELON AUDIT START 🍉");

        // 1. Duplicate Check (Functional Duplicates)
        const dups = await db.run(sql`
            SELECT title, company, COUNT(*) as count 
            FROM opportunities 
            WHERE is_active = 1
            GROUP BY title, company 
            HAVING count > 1
        `);
        console.log(`[audit] Functional Duplicates (Active): ${dups.rows.length}`);
        if (dups.rows.length > 0) {
            console.log("  ⚠️ Duplicates found:", dups.rows.slice(0, 3).map(r => `${r[0]} @ ${r[1]} (${r[2]})`));
        }

        // 2. Timestamp Precision Check
        const tsCheck = await db.run(sql`
            SELECT count(*) 
            FROM opportunities 
            WHERE scraped_at < 1000000000000 
            AND scraped_at IS NOT NULL
        `);
        console.log(`[audit] Legacy 10-digit Timestamps (Seconds): ${tsCheck.rows[0]?.[0] || 0}`);

        // 3. Null Vital Check
        const nullVitals = await db.run(sql`
            SELECT count(*) 
            FROM opportunities 
            WHERE title IS NULL OR source_url IS NULL OR scraped_at IS NULL
        `);
        console.log(`[audit] Jobs with Missing Vitals (Nulls): ${nullVitals.rows[0]?.[0] || 0}`);

        // 4. Tier 1 Integrity Check (No Trash Keywords in Platinum)
        const trashKeywords = ['canonical', 'gitlab', 'software engineer', 'chief executive'];
        let tier1Watermelons = 0;
        const tier1Jobs = await db.select().from(opportunities).where(sql`tier = 0 AND is_active = 1`);
        for (const job of tier1Jobs) {
            const body = (job.title + " " + job.description).toLowerCase();
            if (trashKeywords.some(k => body.includes(k))) {
                tier1Watermelons++;
            }
        }
        console.log(`[audit] Tier 1 Watermelons (Trash in Platinum): ${tier1Watermelons}`);

        console.log("🍉 AUDIT COMPLETE 🍉");
    } finally {
        client.close();
    }
}

audit();
