import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  const [active, gold, last30, trulyNew1hr, zombies, nullTier, growthToday] = await Promise.all([
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND tier != 4`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE tier = 1 AND is_active = 1`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE scraped_at > unixepoch('now', '-30 minutes')`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE created_at > unixepoch('now', '-1 hour')`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND scraped_at > unixepoch('now', '-15 minutes') AND posted_at IS NOT NULL AND posted_at < unixepoch('now', '-14 days')`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE tier IS NULL`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE created_at > unixepoch('now', '-24 hours')`)
  ]);

  const a = (active.rows[0] as any).n;
  const g = (gold.rows[0] as any).n;
  const r30 = (last30.rows[0] as any).n;
  const tn1 = (trulyNew1hr.rows[0] as any).n;
  const zom = (zombies.rows[0] as any).n;
  const nt = (nullTier.rows[0] as any).n;
  const gt = (growthToday.rows[0] as any).n;

  console.log("\n=== STALENESS CERTIFICATIONS ===\n");
  console.log(a > 200 ? `✅ CERT1 PASS: ${a} active visible` : `❌ CERT1 FAIL: ${a} < 200`);
  console.log(g > 0 ? `✅ CERT2 PASS: ${g} GOLD` : `❌ CERT2 FAIL: zero GOLD`);
  console.log(r30 > 0 ? `✅ CERT3 PASS: ${r30} writes in 30min` : `❌ CERT3 FAIL: no writes in 30min`);
  
  console.log("\n--- Staleness Specific ---\n");
  console.log(tn1 > 0 ? `✅ CERT-S1 PASS: ${tn1} TRULY NEW (1hr)` : `❌ CERT-S1 FAIL: 0 truly new`);
  console.log(zom === 0 ? `✅ CERT-S2 PASS: zero zombies` : `❌ CERT-S2 FAIL: ${zom} zombies remain!`);
  console.log(nt === 0 ? `✅ CERT-S3 PASS: zero NULL tier` : `❌ CERT-S3 FAIL: ${nt} null tiers`);
  console.log(gt > 0 ? `✅ CERT-S4 PASS: feed is growing (${gt} new today)` : `❌ CERT-S4 FAIL: no growth today`);
}

run().catch(console.error).finally(() => c.close());
