import { createClient } from "@libsql/client/http";

const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

try {
  const [
    temporalInversion, tierDistribution,
    fingerprintSaturation, nullInventory
  ] = await Promise.all([
    
    // Temporal inversion
    c.execute(`
      SELECT
        SUM(CASE
          WHEN (created_at - posted_at) > 1209600
          THEN 1 ELSE 0 END) AS inverted_14d,
        SUM(CASE
          WHEN (created_at - posted_at) > 604800
          AND  (created_at - posted_at) <= 1209600
          THEN 1 ELSE 0 END) AS inverted_7_14d,
        SUM(CASE
          WHEN (created_at - posted_at) > 259200
          AND  (created_at - posted_at) <= 604800
          THEN 1 ELSE 0 END) AS inverted_3_7d,
        COUNT(*) AS total_with_both_dates
      FROM opportunities
      WHERE is_active = 1
      AND created_at > unixepoch('now', '-24 hours')
      AND posted_at IS NOT NULL
      AND posted_at > 0
    `),
    
    // Tier distribution
    c.execute(`
      SELECT
        tier,
        is_active,
        COUNT(*) AS count
      FROM opportunities
      GROUP BY tier, is_active
      ORDER BY tier ASC, is_active DESC
    `),
    
    // Fingerprint saturation
    c.execute(`
      SELECT
        COUNT(*) AS total_active,
        COUNT(DISTINCT
          LOWER(TRIM(title)) || '|' ||
          LOWER(TRIM(COALESCE(company, '_null')))
        ) AS unique_fingerprints,
        SUM(CASE
          WHEN company IS NULL OR company = ''
          THEN 1 ELSE 0 END) AS null_company,
        SUM(CASE
          WHEN title IS NULL OR title = ''
          THEN 1 ELSE 0 END) AS null_title
      FROM opportunities
      WHERE is_active = 1
    `),
    
    // Null inventory
    c.execute(`
      SELECT
        SUM(CASE WHEN tier IS NULL
          THEN 1 ELSE 0 END) AS null_tier,
        SUM(CASE WHEN content_hash IS NULL
          THEN 1 ELSE 0 END) AS null_hash,
        SUM(CASE WHEN source_url IS NULL
          THEN 1 ELSE 0 END) AS null_url,
        SUM(CASE WHEN posted_at IS NULL
          THEN 1 ELSE 0 END) AS null_event_time
      FROM opportunities
      WHERE is_active = 1
    `)
  ]);
  
  const inv = temporalInversion.rows[0] as any;
  const fp = fingerprintSaturation.rows[0] as any;
  const ni = nullInventory.rows[0] as any;
  
  console.log("\n=== PHASE 2: FIDELITY AUDIT ===\n");
  
  console.log("--- Temporal Inversion (ingested recently, old event_time) ---");
  console.log(`  Ingested last 24hr, posted 14+ days ago: ${inv.inverted_14d}`);
  console.log(`  Ingested last 24hr, posted  7-14d ago:   ${inv.inverted_7_14d}`);
  console.log(`  Ingested last 24hr, posted   3-7d ago:   ${inv.inverted_3_7d}`);
  console.log(`  Sample size (both timestamps):           ${inv.total_with_both_dates}`);
  
  const saturation = fp.total_active > 0
    ? (fp.unique_fingerprints / fp.total_active)
    : 0;
  console.log("\n--- Deduplication Window Saturation ---");
  console.log(`  Active records:       ${fp.total_active}`);
  console.log(`  Unique fingerprints:  ${fp.unique_fingerprints}`);
  console.log(`  Saturation ratio:     ${saturation.toFixed(4)}`);
  
  if (saturation > 0.95) {
    console.log("\n  DIAGNOSIS: DEDUP WINDOW NEAR-SATURATED");
  }
  
  console.log("\n--- Null Field Inventory ---");
  console.log(`  NULL tier:        ${ni.null_tier}`);
  console.log(`  NULL content_hash:${ni.null_hash}`);
  console.log(`  NULL source_url:  ${ni.null_url}`);
  
  console.log("\n--- Tier Distribution ---");
  tierDistribution.rows.forEach((r: any) => {
    console.log(`  Tier ${String(r.tier ?? 'null').padEnd(5)} | Active ${String(r.is_active).padEnd(5)} | Count ${String(r.count).padStart(6)}`);
  });
  
} catch (e: any) {
  console.error("FIDELITY_AUDIT_ERROR:", e.message);
} finally {
  c.close();
}
