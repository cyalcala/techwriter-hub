import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkz17-7f6675f3ab4fIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function fix() {
  console.log("=== PHASE 5: FIXING FINDINGS ===");
  
  // 1. Deactivate Zombies (posted >30d ago but scraped recently)
  const zombies = await c.execute(`UPDATE opportunities SET is_active = 0 WHERE posted_at < unixepoch('now', '-30 days') AND is_active = 1`);
  console.log(`✅ ZOMBIE DEACTIVATION: ${zombies.rowsAffected} records marked inactive.`);
  
  // 2. Clear NULL tiers (ensure visibility)
  const nulls = await c.execute(`UPDATE opportunities SET tier = 3 WHERE tier IS NULL`);
  console.log(`✅ NULL TIER REPAIR: ${nulls.rowsAffected} records assigned BRONZE (3).`);
  
  // 3. (Optional but recommended) Surface Truly New in Health
  // I will suggest this as a code change to health.ts instead of a direct DB fix.
  
  c.close();
}

fix();
