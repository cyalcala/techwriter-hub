import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});
try {
  const now = new Date();
  
  const [zombies, freshFakes, topZombies] = await Promise.all([
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND scraped_at > unixepoch('now', '-1 hour') AND posted_at IS NOT NULL AND posted_at < unixepoch('now', '-7 days')`),
    c.execute(`SELECT COUNT(*) as n FROM opportunities WHERE is_active = 1 AND scraped_at > unixepoch('now', '-15 minutes') AND posted_at IS NOT NULL AND posted_at < unixepoch('now', '-14 days')`),
    c.execute(`SELECT title, source_platform, scraped_at, posted_at, CAST((unixepoch('now') - posted_at) / 86400 AS INTEGER) as days_old FROM opportunities WHERE is_active = 1 AND posted_at IS NOT NULL AND posted_at < unixepoch('now', '-7 days') ORDER BY scraped_at DESC LIMIT 10`)
  ]);
  
  const zombieCount = (zombies.rows[0] as any).n;
  const freshFakeCount = (freshFakes.rows[0] as any).n;
  
  console.log("=== ZOMBIE ANALYSIS ===");
  console.log(`Scraped fresh (1hr) but old (7d+):   ${zombieCount}`);
  console.log(`Scraped fresh (15min) but old (14d+): ${freshFakeCount}`);
  
  if (freshFakeCount > 0) {
    console.log(`\n🚨 ACTIVE DECEPTION DETECTED:`);
    console.log(`   ${freshFakeCount} listings show "Just Now" badge but were posted 14+ days ago.`);
  }
  
  if (topZombies.rows.length > 0) {
    console.log("\n--- Top Zombies (Scraped recently but old) ---");
    topZombies.rows.forEach((r: any) => {
      console.log(`  "${(r as any).title?.substring(0, 40)}" (${(r as any).days_old} days old) from ${(r as any).source_platform}`);
    });
  } else {
    console.log("✅ No zombies found (7d+ content).");
  }
} catch(e: any) {
  console.error("ZOMBIE_FAIL:", e.message);
} finally { c.close(); }
