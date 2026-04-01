import { db, schema } from './client';
import { sql, eq, desc, and, not } from 'drizzle-orm';
import { JobDomain } from './taxonomy';

async function performSreAudit() {
  console.log("🛡️ TITANIUM-GRADE SRE AUDIT: INITIATED\n");
  const now = Date.now();
  const report: any = {
    global_pulse: {},
    domain_freshness: {},
    source_health: [],
    signal_age_distribution: {
      fresh_24h: 0,
      stale_48h: 0,
      stale_72h: 0,
      ancient_96h_plus: 0
    },
    circuits: { open: 0, fail: 0, ok: 0 }
  };

  try {
    // 1. GLOBAL PULSE
    const globalPulse = await db.select({
      lastSeen: sql<number>`max(last_seen_at)`,
      lastScraped: sql<number>`max(scraped_at)`,
      totalActive: sql<number>`count(*)`
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    report.global_pulse = {
      total_active_signals: globalPulse[0].totalActive,
      last_global_pulse_mins: Math.round((now - (globalPulse[0].lastSeen || 0)) / 60000),
      last_scraper_run_mins: Math.round((now - (globalPulse[0].lastScraped || 0)) / 60000)
    };

    // 2. DOMAIN FRESHNESS
    console.log("--- DOMAIN PULSE ---");
    for (const domain of Object.values(JobDomain)) {
      const stats = await db.select({
        count: sql<number>`count(*)`,
        lastSeen: sql<number>`max(last_seen_at)`,
        lastActivity: sql<number>`max(latest_activity_ms)`
      }).from(schema.opportunities)
        .where(and(
          eq(schema.opportunities.isActive, true),
          sql`${schema.opportunities.tags} LIKE ${'%' + domain + '%'}`
        ));

      const lastPulseHrs = ((now - (stats[0].lastSeen || 0)) / 3600000).toFixed(1);
      const lastActivityHrs = ((now - (stats[0].lastActivity || 0)) / 3600000).toFixed(1);
      
      report.domain_freshness[domain] = {
        signals: stats[0].count,
        pulseHrs: lastPulseHrs,
        activityHrs: lastActivityHrs,
        status: Number(lastPulseHrs) > 2 ? "🔴 STALE" : "🟢 FRESH"
      };
      console.log(`${domain.padEnd(30)}: ${report.domain_freshness[domain].status} (${stats[0].count} signals, pulse ${lastPulseHrs}h ago)`);
    }

    // 3. SOURCE HEALTH (CIRCUITS)
    const sources = await db.select().from(schema.systemHealth);
    for (const s of sources) {
      if (s.status === 'OK') report.circuits.ok++;
      else if (s.status === 'CIRCUIT_OPEN') report.circuits.open++;
      else report.circuits.fail++;

      report.source_health.push({
        name: s.sourceName,
        status: s.status,
        lastSuccess: s.lastSuccess ? new Date(s.lastSuccess).toISOString() : "NEVER",
        error: s.errorMessage || "NONE"
      });
    }

    // 4. SIGNAL AGE DISTRIBUTION
    const ageStats = await db.select({
        fresh: sql<number>`sum(case when latest_activity_ms > unixepoch('now', '-24 hours') * 1000 then 1 else 0 end)`,
        stale48: sql<number>`sum(case when latest_activity_ms <= unixepoch('now', '-24 hours') * 1000 and latest_activity_ms > unixepoch('now', '-48 hours') * 1000 then 1 else 0 end)`,
        stale72: sql<number>`sum(case when latest_activity_ms <= unixepoch('now', '-48 hours') * 1000 and latest_activity_ms > unixepoch('now', '-72 hours') * 1000 then 1 else 0 end)`,
        ancient: sql<number>`sum(case when latest_activity_ms <= unixepoch('now', '-72 hours') * 1000 then 1 else 0 end)`
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    report.signal_age_distribution = {
        fresh_24h: ageStats[0].fresh || 0,
        stale_48h: ageStats[0].stale48 || 0,
        stale_72h: ageStats[0].stale72 || 0,
        ancient_96h_plus: ageStats[0].ancient || 0
    };

    console.log("\n--- AUDIT SUMMARY ---");
    console.log(`GLOBAL PULSE: ${report.global_pulse.last_global_pulse_mins}m ago`);
    console.log(`CIRCUITS: ${report.circuits.ok} OK, ${report.circuits.open} OPEN, ${report.circuits.fail} FAIL`);
    console.log(`AGE DIST: 24h: ${report.signal_age_distribution.fresh_24h} | 48h: ${report.signal_age_distribution.stale_48h} | 72h: ${report.signal_age_distribution.stale_72h} | 96h+: ${report.signal_age_distribution.ancient_96h_plus}`);
    
    if (report.signal_age_distribution.ancient_96h_plus > report.signal_age_distribution.fresh_24h) {
        console.warn("\n⚠️ WARNING: System is 'Old-Heavy'. Ancient signals outnumber fresh ones.");
    }

  } catch (err: any) {
    console.error("❌ SRE Audit Failed:", err.message);
  }
}

performSreAudit();
