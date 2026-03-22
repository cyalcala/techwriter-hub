import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [claimed, visible, breakdown] = await Promise.all([
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1 AND tier != 4 AND tier IS NOT NULL`),
    c.execute(`SELECT SUM(CASE WHEN is_active = 1 AND tier = 1 THEN 1 ELSE 0 END) AS visible_gold, SUM(CASE WHEN is_active = 1 AND tier = 2 THEN 1 ELSE 0 END) AS visible_silver, SUM(CASE WHEN is_active = 1 AND tier = 3 THEN 1 ELSE 0 END) AS visible_bronze, SUM(CASE WHEN is_active = 1 AND tier = 4 THEN 1 ELSE 0 END) AS hidden_tier4, SUM(CASE WHEN is_active = 1 AND tier IS NULL THEN 1 ELSE 0 END) AS hidden_null_tier, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive_total FROM opportunities`)
  ]);

  const c_n = (claimed.rows[0] as any).n;
  const v_n = (visible.rows[0] as any).n;
  const bd = breakdown.rows[0] as any;
  const gap = c_n - v_n;

  console.log("\n=== PHASE 3: COMPLETENESS AUDIT ===\n");
  console.log("--- Health Endpoint vs User-Visible ---");
  console.log(`  Health claims active:      ${c_n}`);
  console.log(`  Actually visible to users: ${v_n}`);
  console.log(`  Gap (overcounting):        ${gap}`);

  console.log("\n--- Composition of visible population ---");
  console.log(`  GOLD   (tier 1): ${bd.visible_gold}`);
  console.log(`  SILVER (tier 2): ${bd.visible_silver}`);
  console.log(`  BRONZE (tier 3): ${bd.visible_bronze}`);
  console.log(`  HIDDEN (tier 4): ${bd.hidden_tier4}`);
  console.log(`  HIDDEN (null):   ${bd.hidden_null_tier}`);
  
} catch (e: any) {
  console.error("COMPLETENESS_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
