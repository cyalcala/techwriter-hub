import { createDb } from "./packages/db/client";
import { agencies } from "./packages/db/schema";

async function dump() {
    const { db, client } = createDb();
    try {
        const rows = await db.select().from(agencies);
        console.log(JSON.stringify(rows.map(r => ({ name: r.name, url: r.hiringUrl })), null, 2));
    } finally {
        client.close();
    }
}

dump();
