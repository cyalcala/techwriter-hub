import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function triage() {
  const now = Date.now();

  const [newest, last15min, last1hr, last6hr, total, gold, nullTier] =
    await Promise.all([
      client.execute(`SELECT scraped_at FROM opportunities ORDER BY scraped_at DESC LIMIT 1`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes')`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-1 hour')`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > unixepoch('now', '-6 hours')`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE tier = 1 AND is_active = 1`),
      client.execute(`SELECT COUNT(*) as c FROM opportunities WHERE tier IS NULL`),
    ]);

  const newestTs = (newest.rows[0] as any)?.scraped_at;
  const newestDate = new Date(
    typeof newestTs === "number" ? newestTs * 1000 : newestTs
  );
  const staleMs = now - newestDate.getTime();
  const staleMin = Math.round(staleMs / 60000);
  const staleHrs = (staleMs / 3600000).toFixed(2);

  const last15 = Number((last15min.rows[0] as any).c);
  const last1 = Number((last1hr.rows[0] as any).c);
  const last6 = Number((last6hr.rows[0] as any).c);
  const totalActive = Number((total.rows[0] as any).c);
  const goldCount = Number((gold.rows[0] as any).c);
  const nullTierCount = Number((nullTier.rows[0] as any).c);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   VA.INDEX STALENESS TRIAGE REPORT   ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`\nAUDIT TIME:     ${new Date().toISOString()}`);
  console.log(`NEWEST RECORD:  ${newestDate.toISOString()}`);
  console.log(`STALE BY:       ${staleMin} minutes (${staleHrs} hrs)`);
  console.log(`\nWRITES:`);
  console.log(`  Last 15 min:  ${last15} ${last15 > 0 ? "✅" : "❌"}`);
  console.log(`  Last 1 hr:    ${last1}  ${last1 > 0 ? "✅" : "⚠️"}`);
  console.log(`  Last 6 hrs:   ${last6}  ${last6 > 0 ? "✅" : "🚨"}`);
  console.log(`\nDATA HEALTH:`);
  console.log(`  Total Active: ${totalActive}`);
  console.log(`  Gold Tier:    ${goldCount} ${goldCount > 0 ? "✅" : "❌"}`);
  console.log(`  NULL Tier:    ${nullTierCount} ${nullTierCount === 0 ? "✅" : "⚠️ VISIBILITY LEAK"}`);

  console.log("\n╔══════════════════════════════════════╗");
  if (staleMin < 15) {
    console.log("║  🟢 VERDICT: HEALTHY — Under 15 min  ║");
    console.log("║  No action needed. All clear.         ║");
  } else if (staleMin < 30) {
    console.log("║  🟡 VERDICT: MILD STALE — 15-30 min  ║");
    console.log("║  → CHECK: Phase 1 (Trigger.dev runs)  ║");
  } else if (staleMin < 120) {
    console.log("║  🟠 VERDICT: STALE — 30min-2hr        ║");
    console.log("║  → CHECK: Phase 1 then Phase 2        ║");
  } else if (staleMin < 360) {
    console.log("║  🔴 VERDICT: VERY STALE — 2-6hrs      ║");
    console.log("║  → CHECK: Phase 2 (Scraper Sources)   ║");
    console.log("║  → CHECK: Phase 3 (Sifter/Dedup)      ║");
  } else {
    console.log("║  🚨 VERDICT: CRITICAL — Over 6hrs     ║");
    console.log("║  → FULL PROTOCOL: All phases           ║");
    console.log("║  → Trigger emergency harvest NOW       ║");
  }
  console.log("╚══════════════════════════════════════╝\n");
}

triage().catch(console.error).finally(() => client.close());
