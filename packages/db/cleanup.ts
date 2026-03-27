import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const dryRun = process.argv.includes("--dry-run");

async function executePurge() {
  const c = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log(`═══ VA.INDEX 5-LAYER PURGE START ${dryRun ? "[DRY RUN]" : "[LIVE]"} ═══`);

  // Initial Count
  const before = await c.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log(`Starting Total: ${before.rows[0][0]} opportunities`);

  // --- LAYER 1: Event Horizon Deactivations (Soft Purge) ---
  console.log("\n[Layer 1] Deactivating listings older than 21 days...");
  const l1Query = "UPDATE opportunities SET is_active = 0 WHERE posted_at < (unixepoch('now') - (21 * 24 * 60 * 60)) * 1000 AND is_active = 1";
  if (dryRun) {
    const l1Count = await c.execute("SELECT COUNT(*) FROM opportunities WHERE posted_at < (unixepoch('now') - (21 * 24 * 60 * 60)) * 1000 AND is_active = 1");
    console.log(`  Would deactivate: ${l1Count.rows[0][0]} records`);
  } else {
    const result = await c.execute(l1Query);
    console.log(`  Deactivated: ${result.rowsAffected} records`);
  }

  // --- LAYER 2: Saturation Hard Deletions ---
  console.log("\n[Layer 2] Hard deleting stale signals...");
  const l2aQuery = "DELETE FROM opportunities WHERE is_active = 0 AND scraped_at < (unixepoch('now') - (60 * 24 * 60 * 60)) * 1000";
  const l2bQuery = "DELETE FROM opportunities WHERE tier = 4 AND scraped_at < (unixepoch('now') - (7 * 24 * 60 * 60)) * 1000";
  
  if (dryRun) {
    const l2aCount = await c.execute("SELECT COUNT(*) FROM opportunities WHERE is_active = 0 AND scraped_at < (unixepoch('now') - (60 * 24 * 60 * 60)) * 1000");
    const l2bCount = await c.execute("SELECT COUNT(*) FROM opportunities WHERE tier = 4 AND scraped_at < (unixepoch('now') - (7 * 24 * 60 * 60)) * 1000");
    console.log(`  Would delete: ${l2aCount.rows[0][0]} inactive (>60d) and ${l2bCount.rows[0][0]} trash (>7d) signals`);
  } else {
    const r2a = await c.execute(l2aQuery);
    const r2b = await c.execute(l2bQuery);
    console.log(`  Deleted: ${r2a.rowsAffected} inactive and ${r2b.rowsAffected} trash signals`);
  }

  // --- LAYER 3: Algorithmic Garbage Hard Deletions ---
  console.log("\n[Layer 3] Purging algorithmic noise...");
  const l3hnQuery = `
    DELETE FROM opportunities 
    WHERE source_platform = 'HackerNews' 
    AND (
      LENGTH(title) < 10 
      OR LENGTH(title) > 200 
      OR title LIKE 'Hi all%' 
      OR (title LIKE 'Looking for%' AND LENGTH(title) > 150)
      OR title LIKE 'San %'
    )
  `;
  const l3ojQuery = `
    DELETE FROM opportunities 
    WHERE source_platform = 'OnlineJobs' 
    AND title NOT LIKE '%hire%' 
    AND title NOT LIKE '%job%' 
    AND title NOT LIKE '%apply%'
    AND title NOT LIKE '%career%'
  `;

  if (dryRun) {
    const hnCount = await c.execute("SELECT COUNT(*) FROM opportunities WHERE source_platform = 'HackerNews' AND (LENGTH(title) < 10 OR LENGTH(title) > 200 OR title LIKE 'Hi all%' OR (title LIKE 'Looking for%' AND LENGTH(title) > 150) OR title LIKE 'San %')");
    const ojCount = await c.execute("SELECT COUNT(*) FROM opportunities WHERE source_platform = 'OnlineJobs' AND title NOT LIKE '%hire%' AND title NOT LIKE '%job%' AND title NOT LIKE '%apply%' AND title NOT LIKE '%career%'");
    console.log(`  Would purge: ${hnCount.rows[0][0]} HN noise and ${ojCount.rows[0][0]} OJ blog articles`);
  } else {
    const r3hn = await c.execute(l3hnQuery);
    const r3oj = await c.execute(l3ojQuery);
    console.log(`  Purged: ${r3hn.rowsAffected} HN noise and ${r3oj.rowsAffected} OJ blogs`);
  }

  // --- LAYER 4: Legacy Exact Duplicates ---
  console.log("\n[Layer 4] Cleaning legacy clones...");
  const l4Query = `
    DELETE FROM opportunities WHERE id IN (
      SELECT o2.id FROM opportunities o1 
      JOIN opportunities o2 ON o1.title = o2.title AND o1.id < o2.id
    )
  `;
  if (dryRun) {
    const l4Count = await c.execute("SELECT COUNT(o2.id) FROM opportunities o1 JOIN opportunities o2 ON o1.title = o2.title AND o1.id < o2.id");
    console.log(`  Would collapse: ${l4Count.rows[0][0]} semantic duplicates`);
  } else {
    const r4 = await c.execute(l4Query);
    console.log(`  Collapsed: ${r4.rowsAffected} duplicates`);
  }

  // --- LAYER 5: Agency Directory Pruning ---
  console.log("\n[Layer 5] Pruning low-value agency directory...");
  const l5agencyQuery = "DELETE FROM agencies WHERE hiring_url LIKE '%virtualcoworker.com.au%' OR name LIKE '%Virtual Coworker%'";
  const l5oppQuery = "DELETE FROM opportunities WHERE company LIKE '%Virtual Coworker%' OR source_url LIKE '%virtualcoworker.com.au%'";
  
  if (dryRun) {
    const aCount = await c.execute("SELECT COUNT(*) FROM agencies WHERE hiring_url LIKE '%virtualcoworker.com.au%' OR name LIKE '%Virtual Coworker%'");
    const oCount = await c.execute("SELECT COUNT(*) FROM opportunities WHERE company LIKE '%Virtual Coworker%' OR source_url LIKE '%virtualcoworker.com.au%'");
    console.log(`  Would prune: ${aCount.rows[0][0]} agencies and ${oCount.rows[0][0]} associated opportunities`);
  } else {
    const ra = await c.execute(l5agencyQuery);
    const ro = await c.execute(l5oppQuery);
    console.log(`  Pruned: ${ra.rowsAffected} agencies and ${ro.rowsAffected} opportunities`);
  }

  // --- LAYER 6: Physical Storage Reclamation (DBRE) ---
  if (!dryRun) {
    console.log("\n[Layer 6] Vacuuming database to reclaim storage...");
    await c.execute("VACUUM");
    console.log("  Storage reclaimed successfully.");
  }

  // Final count
  const after = await c.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log(`\nFinal Total: ${after.rows[0][0]} opportunities`);
  
  c.close();
  console.log("\n═══ PURGE COMPLETE ═══");
}

executePurge().catch(console.error);
