import { createClient } from "@libsql/client/http";
const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});
try {
  const now = new Date();
  
  const [
    total, active, tier1, tier2,
    tier3, tier4, 
    last15, last1hr, last6hr,
    nullTier, nullCompany,
    duplicates, zombies
  ] = await Promise.all([
    c.execute("SELECT COUNT(*) as n FROM opportunities"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE tier = 1 AND is_active = 1"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE tier = 2 AND is_active = 1"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE tier = 3 AND is_active = 1"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE tier = 4"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes')"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE scraped_at > unixepoch('now', '-1 hour')"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE scraped_at > unixepoch('now', '-6 hours')"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE tier IS NULL"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE company IS NULL OR company = ''"),
    c.execute("SELECT title, company, COUNT(*) as dupes FROM opportunities GROUP BY title, company HAVING dupes > 1 ORDER BY dupes DESC LIMIT 10"),
    c.execute("SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND scraped_at > unixepoch('now', '-1 hour') AND (posted_at IS NULL OR posted_at < unixepoch('now', '-30 days'))")
  ]);
  
  const t = (total.rows[0] as any).n;
  const a = (active.rows[0] as any).n;
  const t1 = (tier1.rows[0] as any).n;
  const t2 = (tier2.rows[0] as any).n;
  const t3 = (tier3.rows[0] as any).n;
  const t4 = (tier4.rows[0] as any).n;
  const res = 0; // Column doesn't exist
  const r15 = (last15.rows[0] as any).n;
  const r1h = (last1hr.rows[0] as any).n;
  const r6h = (last6hr.rows[0] as any).n;
  const nullT = (nullTier.rows[0] as any).n;
  const nullC = (nullCompany.rows[0] as any).n;
  const zomb = (zombies.rows[0] as any).n;
  
  console.log("=== RATHOLE ANALYSIS ===");
  console.log("\n--- Volume Funnel ---");
  console.log(`TOTAL ALL TIME:     ${t}`);
  console.log(`ACTIVE:             ${a}`);
  console.log(`TIER 1 GOLD:        ${t1}`);
  console.log(`TIER 2 SILVER:      ${t2}`);
  console.log(`TIER 3 BRONZE:      ${t3}`);
  console.log(`TIER 4 TRASH:       ${t4}`);
  console.log(`RESTRICTED:         ${res} (Column not found)`);
  console.log(`NULL TIER:          ${nullT}`);
  console.log(`NULL COMPANY:       ${nullC}`);
  
  console.log("\n--- Freshness Funnel ---");
  console.log(`WRITTEN LAST 15MIN: ${r15}`);
  console.log(`WRITTEN LAST 1HR:   ${r1h}`);
  console.log(`WRITTEN LAST 6HR:   ${r6h}`);
  
  console.log("\n--- Ratholes Detected ---");
  
  const trashRatio = t > 0 ? Math.round(t4 / t * 100) : 0;
  if (trashRatio > 70) {
    console.log(`🚨 RATHOLE: Sifter killing ${trashRatio}% of all listings.`);
  } else {
    console.log(`✅ Sifter ratio OK: ${trashRatio}% trashed`);
  }
  
  if (nullT > 0) {
    console.log(`🚨 RATHOLE: ${nullT} listings have NULL tier — invisible to feed.`);
  } else {
    console.log(`✅ No NULL tier listings`);
  }
  
  if (nullC > 0) {
    console.log(`⚠️ WARNING: ${nullC} listings have no company — dedup may fail.`);
  }
  
  if (r15 === 0 && r1h === 0) {
    console.log(`🚨 RATHOLE: Zero writes in 1 hour. Pipeline stalled.`);
  } else if (r15 === 0) {
    console.log(`⚠️ WARNING: No writes in 15min. May have missed a cycle.`);
  }
  
  if (zomb > 0) {
    console.log(`⚠️ ZOMBIE: ${zomb} listings scraped fresh but posted 30+ days ago.`);
  }
  
  console.log("\n--- Duplicate Ratholes ---");
  if (duplicates.rows.length > 0) {
    console.log(`🚨 DUPLICATES FOUND:`);
    duplicates.rows.forEach((r: any) => {
      console.log(`   "${r.title?.substring(0, 40)}" @ ${r.company}: ${r.dupes}x`);
    });
  } else {
    console.log(`✅ No semantic duplicates`);
  }
  
} catch(e: any) {
  console.error("RATHOLE_FAIL:", e.message);
} finally { c.close(); }
