import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});
try {
  const [claimed, actual, tierDist] = await Promise.all([
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND tier != 4`),
    c.execute(`SELECT SUM(CASE WHEN tier = 1 THEN 1 ELSE 0 END) as gold, SUM(CASE WHEN tier = 2 THEN 1 ELSE 0 END) as silver, SUM(CASE WHEN tier = 3 THEN 1 ELSE 0 END) as bronze, SUM(CASE WHEN tier = 4 THEN 1 ELSE 0 END) as trash, SUM(CASE WHEN tier IS NULL THEN 1 ELSE 0 END) as null_tier FROM opportunities WHERE is_active = 1`)
  ]);
  
  const claimedN = (claimed.rows[0] as any).n;
  const actualN = (actual.rows[0] as any).n;
  const dist = tierDist.rows[0] as any;
  
  console.log("=== METRIC CROSS-EXAM ===");
  console.log(`Health endpoint claims:   ${claimedN} active`);
  console.log(`Actually visible (non-T4): ${actualN}`);
  
  const discrepancy = claimedN - actualN;
  if (discrepancy > 0) {
    console.log(`\n🚨 DISCREPANCY: Health overcounts by ${discrepancy}`);
    console.log(`   Tier 4 (TRASH) in active count: ${dist?.trash || 0}`);
    console.log(`   Null tier (Invisible):           ${dist?.null_tier || 0}`);
  }
  
  console.log("\n--- Visible Distribution ---");
  console.log(`GOLD:   ${dist?.gold || 0}`);
  console.log(`SILVER: ${dist?.silver || 0}`);
  console.log(`BRONZE: ${dist?.bronze || 0}`);
} catch(e: any) {
  console.error("CROSS_FAIL:", e.message);
} finally { c.close(); }
