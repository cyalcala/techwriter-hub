import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});
try {
  const now = new Date();
  
  const [
    lastScrape, lastPosted,
    sourceBreakdown,
    tierOverTime
  ] = await Promise.all([
    c.execute(`SELECT scraped_at, title, source_platform FROM opportunities ORDER BY scraped_at DESC LIMIT 1`),
    c.execute(`SELECT posted_at, title, source_platform FROM opportunities WHERE posted_at IS NOT NULL ORDER BY posted_at DESC LIMIT 1`),
    c.execute(`SELECT source_platform, COUNT(*) as total, SUM(CASE WHEN scraped_at > unixepoch('now', '-1 hour') THEN 1 ELSE 0 END) as recent, SUM(CASE WHEN posted_at > unixepoch('now', '-6 hours') THEN 1 ELSE 0 END) as posted_recent FROM opportunities WHERE is_active = 1 GROUP BY source_platform ORDER BY recent DESC`),
    c.execute(`SELECT SUM(CASE WHEN posted_at > unixepoch('now', '-1 hour') THEN 1 ELSE 0 END) as p_1hr, SUM(CASE WHEN posted_at > unixepoch('now', '-6 hours') THEN 1 ELSE 0 END) as p_6hr, SUM(CASE WHEN posted_at > unixepoch('now', '-24 hours') THEN 1 ELSE 0 END) as p_24hr, COUNT(*) as total_active FROM opportunities WHERE is_active = 1`)
  ]);
  
  console.log("=== ECHO CHAMBER ANALYSIS (NO CREATED_AT) ===");
  console.log("\n--- The Heartbeat Lie ---");
  
  const lastScrapeRow = lastScrape.rows[0] as any;
  const lastPostedRow = lastPosted.rows[0] as any;
  
  const scrapedAt = lastScrapeRow?.scraped_at ? new Date(typeof lastScrapeRow.scraped_at === 'number' ? lastScrapeRow.scraped_at * 1000 : lastScrapeRow.scraped_at) : null;
  const postedAt = lastPostedRow?.posted_at ? new Date(typeof lastPostedRow.posted_at === 'number' ? lastPostedRow.posted_at * 1000 : lastPostedRow.posted_at) : null;
  
  const scrapedMinsAgo = scrapedAt ? Math.round((now.getTime() - scrapedAt.getTime()) / 60000) : 999;
  const postedMinsAgo = postedAt ? Math.round((now.getTime() - postedAt.getTime()) / 60000) : 999;
  
  console.log(`Last scraped_at (heartbeat source): ${scrapedMinsAgo} mins ago`);
  console.log(`  Title: ${lastScrapeRow?.title?.substring(0, 45)}`);
  console.log(`\nLast posted_at (proxy for truly new): ${postedMinsAgo} mins ago`);
  console.log(`  Title: ${lastPostedRow?.title?.substring(0, 45)}`);
  
  if (postedMinsAgo > 120 && scrapedMinsAgo < 15) {
    console.log(`\n🚨 ECHO CHAMBER CONFIRMED:`);
    console.log(`   Health says fresh (${scrapedMinsAgo}min ago)`);
    console.log(`   But last job was posted ${postedMinsAgo} mins ago`);
    console.log(`   The system is RECYCLING old data and reporting a "Live Heartbeat".`);
  }
  
  console.log("\n--- Source Activity ---");
  sourceBreakdown.rows.forEach((r: any) => {
    const flag = r.posted_recent === 0 && r.recent > 0 ? "⚠️ RECYCLING" : r.posted_recent > 0 ? "✅ RECENT POSTS" : "💤 NO RECENT SIGNS";
    console.log(`${(r.source_platform || 'Unknown').substring(0, 20).padEnd(22)} total:${String(r.total).padStart(4)} recent_scraped:${String(r.recent).padStart(4)} recent_posted:${String(r.posted_recent).padStart(4)} ${flag}`);
  });
  
} catch(e: any) {
  console.error("ECHO_FAIL:", e.message);
} finally { c.close(); }
