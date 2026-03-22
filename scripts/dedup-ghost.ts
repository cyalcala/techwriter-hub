import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});
try {
  const now = new Date();
  
  const [sourceFingerprints, growthRate] = await Promise.all([
    c.execute(`SELECT source_platform, COUNT(*) as total, COUNT(DISTINCT title || '|' || COALESCE(company,'')) as unique_fps, MIN(scraped_at) as oldest, MAX(scraped_at) as newest FROM opportunities WHERE is_active = 1 GROUP BY source_platform ORDER BY total DESC`),
    c.execute(`SELECT SUM(CASE WHEN scraped_at > unixepoch('now', '-24 hours') THEN 1 ELSE 0 END) as scraped_today, COUNT(*) as total FROM opportunities WHERE is_active = 1`)
  ]);
  
  console.log("=== DEDUP GHOST ANALYSIS ===");
  const growth = growthRate.rows[0] as any;
  const scrapedToday = growth?.scraped_today || 0;
  const total = growth?.total || 1;
  const activeRate = Math.round(scrapedToday / total * 100);
  
  console.log(`\nActive/Updated today: ${scrapedToday} (${activeRate}%)`);
  
  console.log("\n--- Source Dedup Status ---");
  sourceFingerprints.rows.forEach((r: any) => {
    const dedupRate = r.total > 0 ? Math.round(r.unique_fps / r.total * 100) : 0;
    console.log(`${(r.source_platform || 'Unknown').substring(0, 20).padEnd(22)} total:${String(r.total).padStart(4)} unique:${String(r.unique_fps).padStart(4)} dedup_eff:${100-dedupRate}%`);
  });
} catch(e: any) {
  console.error("DEDUP_FAIL:", e.message);
} finally { c.close(); }
