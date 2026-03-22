import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  console.log("=== REMEDIATION: FIXING AUDIT FINDINGS ===\n");

  try {
    // 1. P0: Purge Saturated Fingerprints
    console.log("--- P0: Saturation Purge ---");
    const r1 = await c.execute(`DELETE FROM opportunities WHERE is_active = 0 AND scraped_at < unixepoch('now', '-60 days')`);
    console.log(`  Purged Inactive > 60d: ${r1.rowsAffected}`);
    
    const r2 = await c.execute(`DELETE FROM opportunities WHERE tier = 4 AND scraped_at < unixepoch('now', '-7 days')`);
    console.log(`  Purged Tier 4 > 7d:    ${r2.rowsAffected}`);

    // 2. P1: Deactivate Temporal Inversion (Zombies)
    console.log("\n--- P1: Zombie Deactivation ---");
    const r3 = await c.execute(`UPDATE opportunities SET is_active = 0 WHERE is_active = 1 AND posted_at IS NOT NULL AND posted_at > 0 AND posted_at < unixepoch('now', '-21 days')`);
    console.log(`  Deactivated Zombies > 21d: ${r3.rowsAffected}`);

    // 3. P1: Fix Tier 4 / is_active Anomaly (Safety Check)
    const r4 = await c.execute(`UPDATE opportunities SET is_active = 0 WHERE tier = 4 AND is_active = 1`);
    console.log(`  Fixed T4 Active Anomaly:   ${r4.rowsAffected}`);

    // 4. Report Final Saturation
    const after = await c.execute(`SELECT COUNT(*) AS total, COUNT(DISTINCT LOWER(TRIM(title)) || '|' || LOWER(TRIM(COALESCE(company, '_null')))) AS unique_fps FROM opportunities WHERE is_active = 1`);
    const a = after.rows[0] as any;
    const sat = a.total > 0 ? (a.unique_fps / a.total) : 0;
    console.log(`\nNew Saturation Ratio: ${sat.toFixed(4)} (Total Active: ${a.total})`);

  } catch (e: any) {
    console.error("FIX_ERROR:", e.message);
  } finally {
    c.close();
  }
}

run();
