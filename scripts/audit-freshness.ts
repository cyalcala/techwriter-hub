import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [
    byIngestion, byProcessing,
    perSourceIngestion, watermark,
    tailLatency
  ] = await Promise.all([
    
    // True ingestion rate
    c.execute(`
      SELECT
        SUM(CASE WHEN created_at >
          unixepoch('now', '-15 minutes')
          THEN 1 ELSE 0 END) AS new_15m,
        SUM(CASE WHEN created_at >
          unixepoch('now', '-1 hour')
          THEN 1 ELSE 0 END) AS new_1h,
        SUM(CASE WHEN created_at >
          unixepoch('now', '-6 hours')
          THEN 1 ELSE 0 END) AS new_6h,
        SUM(CASE WHEN created_at >
          unixepoch('now', '-24 hours')
          THEN 1 ELSE 0 END) AS new_24h
      FROM opportunities
      WHERE is_active = 1
    `),
    
    // Processing time
    c.execute(`
      SELECT
        SUM(CASE WHEN scraped_at >
          unixepoch('now', '-15 minutes')
          THEN 1 ELSE 0 END) AS proc_15m,
        SUM(CASE WHEN scraped_at >
          unixepoch('now', '-1 hour')
          THEN 1 ELSE 0 END) AS proc_1h,
        SUM(CASE WHEN scraped_at >
          unixepoch('now', '-6 hours')
          THEN 1 ELSE 0 END) AS proc_6h
      FROM opportunities
      WHERE is_active = 1
    `),
    
    // Per-source ingestion vs churn
    c.execute(`
      SELECT
        source_platform,
        COUNT(*) AS total_active,
        SUM(CASE WHEN created_at >
          unixepoch('now', '-1 hour')
          THEN 1 ELSE 0 END) AS ingested_1h,
        SUM(CASE WHEN scraped_at >
          unixepoch('now', '-1 hour')
          AND created_at <=
          unixepoch('now', '-1 hour')
          THEN 1 ELSE 0 END) AS refreshed_1h
      FROM opportunities
      WHERE is_active = 1
      GROUP BY source_platform
      ORDER BY total_active DESC
    `),
    
    // Watermark Analysis
    c.execute(`
      SELECT
        MIN(posted_at)  AS event_time_floor,
        MAX(created_at) AS ingestion_ceiling,
        CAST(
          (MAX(created_at) - MIN(posted_at))
          / 3600.0 AS REAL
        ) AS max_lag_hrs
      FROM opportunities
      WHERE is_active = 1
      AND created_at >
        unixepoch('now', '-1 hour')
      AND posted_at IS NOT NULL
    `),
    
    // Write latency distribution
    c.execute(`
      SELECT
        CASE
          WHEN (created_at - posted_at) < 900
            THEN 'under_15m'
          WHEN (created_at - posted_at) < 3600
            THEN '15m_to_1h'
          WHEN (created_at - posted_at) < 86400
            THEN '1h_to_24h'
          ELSE 'over_24h'
        END AS latency_bucket,
        COUNT(*) AS record_count
      FROM opportunities
      WHERE is_active = 1
      AND posted_at IS NOT NULL
      AND created_at IS NOT NULL
      AND posted_at > 0
      GROUP BY latency_bucket
      ORDER BY MIN(created_at - posted_at)
    `)
  ]);
  
  const ing = byIngestion.rows[0] as any;
  const proc = byProcessing.rows[0] as any;
  const wm = watermark.rows[0] as any;
  
  console.log("\n=== PHASE 1: FRESHNESS AUDIT ===\n");
  
  console.log("--- Ingestion Rate (created_at) ---");
  console.log(`  New records last 15min: ${ing.new_15m}`);
  console.log(`  New records last  1hr:  ${ing.new_1h}`);
  console.log(`  New records last  6hr:  ${ing.new_6h}`);
  console.log(`  New records last 24hr:  ${ing.new_24h}`);
  
  console.log("\n--- Processing Churn (scraped_at) ---");
  console.log(`  Records touched last 15min: ${proc.proc_15m}`);
  console.log(`  Records touched last  1hr:  ${proc.proc_1h}`);
  
  const ingestionRatio15m = proc.proc_15m > 0
    ? Math.round(ing.new_15m / proc.proc_15m * 100)
    : 0;
  const ingestionRatio1h = proc.proc_1h > 0
    ? Math.round(ing.new_1h / proc.proc_1h * 100)
    : 0;
  
  console.log("\n--- Ingestion-to-Processing Ratio ---");
  console.log(`  15min window: ${ingestionRatio15m}% of processed are truly new`);
  console.log(`  1hr window:   ${ingestionRatio1h}% of processed are truly new`);
  
  if (ingestionRatio1h === 0 && proc.proc_1h > 0) {
    console.log("\n  DIAGNOSIS: CLOSED-LOOP VERIFICATION FAILURE");
    console.log("  The harvester is running and touching records.");
    console.log("  Zero of those touches are new ingestion events.");
    console.log("  The health endpoint reports freshness from scraped_at, so it will report HEALTHY.");
    console.log("  No new data is entering the system.");
  } else if (ingestionRatio1h < 5) {
    console.log("\n  DIAGNOSIS: NEAR-SATURATED PIPELINE");
    console.log(`  Only ${ingestionRatio1h}% of harvester output is new.`);
    console.log("  Monitor for full saturation.");
  } else {
    console.log("\n  DIAGNOSIS: INGESTION ACTIVE");
  }
  
  console.log("\n--- Watermark Analysis ---");
  if (wm.max_lag_hrs !== null) {
    console.log(`  Max lag (event→ingestion) in last 1hr: ${Number(wm.max_lag_hrs).toFixed(1)}hrs`);
    if (Number(wm.max_lag_hrs) > 24) {
      console.log("  WARNING: Temporal inversion detected.");
      console.log("  Recently ingested records have event_time more than 24 hours in the past.");
      console.log("  Likely cause: zombie refresh cycle or source returning stale cached listings.");
    }
  } else {
    console.log("  No records ingested in last hour.");
    console.log("  Cannot compute watermark.");
  }
  
  console.log("\n--- Write Latency Distribution ---");
  tailLatency.rows.forEach((r: any) => {
    console.log(`  ${String(r.latency_bucket).padEnd(15)}: ${r.record_count} records`);
  });
  
  console.log("\n--- Per-Source Ingestion vs Churn ---");
  perSourceIngestion.rows.forEach((r: any) => {
    const total = Number(r.ingested_1h) + Number(r.refreshed_1h);
    const newRatio = total > 0
      ? Math.round(Number(r.ingested_1h) / total * 100)
      : 0;
    const verdict = Number(r.ingested_1h) > 0
      ? `INGESTING (${newRatio}% new)`
      : Number(r.refreshed_1h) > 0
      ? "REFRESH ONLY — no new ingestion"
      : "INACTIVE";
    console.log(
      `  ${String(r.source_platform || "Unknown").substring(0, 20).padEnd(22)}` +
      `total:${String(r.total_active).padStart(5)} ` +
      `new:${String(r.ingested_1h).padStart(4)} ` +
      `refresh:${String(r.refreshed_1h).padStart(4)} ` +
      `→ ${verdict}`
    );
  });
  
} catch (e: any) {
  console.error("FRESHNESS_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
