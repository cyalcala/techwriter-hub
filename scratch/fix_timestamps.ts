import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { sql, gte } from "drizzle-orm";

async function fixTimestamps() {
  console.log("🛠️ [REMEDIATION] Auditing Timestamps for Corruption...");
  
  const now = Date.now();
  const futureThreshold = now + (2 * 60 * 60 * 1000); // 2 hours ahead buffer
  
  // 1. Fix Futurist Drifters (Dates in the deep future)
  const drifters = await db.run(sql`
    UPDATE opportunities 
    SET scraped_at = ${now}, latest_activity_ms = ${now}
    WHERE scraped_at > ${futureThreshold}
  `);
  
  console.log(`✅ [REMEDIATION] Fixed ${drifters.rowsAffected} future/astronomical timestamps.`);

  // 2. Fix Epoch Drift (Seconds vs Ms)
  const epochFix = await db.run(sql`
    UPDATE opportunities 
    SET scraped_at = scraped_at * 1000 
    WHERE scraped_at > 0 AND scraped_at < 9999999999
  `);
  
  console.log(`✅ [REMEDIATION] Fixed ${epochFix.rowsAffected} epoch-scale drifters.`);

  // 3. Sync latest_activity_ms if missing or stale
  const sync = await db.run(sql`
    UPDATE opportunities 
    SET latest_activity_ms = scraped_at 
    WHERE latest_activity_ms = 0 OR latest_activity_ms IS NULL
  `);
  
  console.log(`✅ [REMEDIATION] Synchronized ${sync.rowsAffected} activity pulse markers.`);
  
  process.exit(0);
}

fixTimestamps();
