import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ESM __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure we load the environment variables from the root
dotenv.config({ path: resolve(__dirname, "../../.env") });

async function checkDriftDebug() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    const client = createClient({ url: url!, authToken: authToken! });

    try {
        const r = await client.execute("SELECT max(created_at) as maxC, unixepoch('now') * 1000 as nowC FROM opportunities");
        const { maxC, nowC } = r.rows[0];
        const driftMins = Math.round((Number(nowC) - Number(maxC)) / (1000 * 60));
        
        console.log(`Max Created: ${maxC} (${new Date(Number(maxC)).toISOString()})`);
        console.log(`System Now : ${nowC} (${new Date(Number(nowC)).toISOString()})`);
        console.log(`Total Drift: ${driftMins} minutes`);

    } catch (err: any) {
        console.error("Audit Failed:", err.message);
    } finally {
        client.close();
    }
}

checkDriftDebug();
