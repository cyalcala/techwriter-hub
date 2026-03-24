import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function fixEpochs() {
  console.log("🛠️ Starting Epoch Correction...");
  
  // 1. Fix scraped_at
  const res1 = await db.execute(`
    UPDATE opportunities 
    SET scraped_at = scraped_at * 1000 
    WHERE scraped_at < 9999999999
  `);
  console.log(`✅ Fixed ${res1.rowsAffected} records for scraped_at.`);

  // 2. Fix latest_activity_ms (might already be 0 or seconds)
  const res2 = await db.execute(`
    UPDATE opportunities 
    SET latest_activity_ms = latest_activity_ms * 1000 
    WHERE latest_activity_ms > 0 AND latest_activity_ms < 9999999999
  `);
  console.log(`✅ Fixed ${res2.rowsAffected} records for latest_activity_ms.`);

  // 3. Sync latest_activity_ms to scraped_at if it's 0
  const res3 = await db.execute(`
    UPDATE opportunities 
    SET latest_activity_ms = scraped_at 
    WHERE latest_activity_ms = 0 OR latest_activity_ms IS NULL
  `);
  console.log(`✅ Synced ${res3.rowsAffected} records from scraped_at.`);

  console.log("🏁 Epoch Correction Complete.");
}

fixEpochs().catch(console.error);
