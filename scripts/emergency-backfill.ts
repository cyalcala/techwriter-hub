import { db } from "../packages/db/client";
import { opportunities, logs } from "../packages/db/schema";
import { sql, isNull, eq, ne, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function runBackfill() {
  console.log("🚑 STARTING EMERGENCY DATABASE BACKFILL...");

  try {
    // 1. Backfill isActive for all records (Default to true)
    console.log("-> Backfilling 'isActive' flags...");
    const activeUpdate = await db.update(opportunities)
      .set({ isActive: true })
      .where(or(isNull(opportunities.isActive), eq(opportunities.isActive, false)));
    console.log(`   [✓] Activated legacy records.`);

    // 2. Sync isActive with Tier (Tier 4 is always inactive Trash)
    console.log("-> Syncing 'isActive' with Tier exclusion...");
    await db.update(opportunities)
      .set({ isActive: false })
      .where(eq(opportunities.tier, 4));
    console.log(`   [✓] Deactivated Tier 4 records.`);

    // 3. Backfill latestActivityMs using scrapedAt
    console.log("-> Backfilling 'latestActivityMs' timestamps...");
    // We update records where it's 0 or null
    // SQLite doesn't have a direct getTime from ISO string in SQL easily without complexity 
    // So we fetch and batch update for safety or use strftime if supported.
    // However, since we want 100% precision, we'll fetch IDs and scrapedAt.
    
    const staleRecords = await db.select({ 
      id: opportunities.id, 
      scrapedAt: opportunities.scrapedAt 
    })
    .from(opportunities)
    .where(or(isNull(opportunities.latestActivityMs), eq(opportunities.latestActivityMs, 0)));

    console.log(`   [!] Found ${staleRecords.length} records needing timestamp alignment.`);
    
    let updatedCount = 0;
    // Batch update to avoid locking Turso for too long
    for (let i = 0; i < staleRecords.length; i += 50) {
      const batch = staleRecords.slice(i, i + 50);
      await Promise.all(batch.map(rec => {
        const ts = rec.scrapedAt ? new Date(rec.scrapedAt).getTime() : Date.now();
        return db.update(opportunities)
          .set({ latestActivityMs: ts })
          .where(eq(opportunities.id, rec.id));
      }));
      updatedCount += batch.length;
      if (i % 250 === 0) console.log(`   ...Progress: ${updatedCount}/${staleRecords.length}`);
    }
    
    console.log(`   [✓] Aligned ${updatedCount} timestamps.`);

    // 4. Log the recovery
    await db.insert(logs).values({
      id: uuidv4(),
      message: `EMERGENCY RECOVERY: Backfilled ${staleRecords.length} legacy records to restore UI visibility.`,
      level: "snapshot",
      timestamp: new Date()
    });

    console.log("\n✅ EMERGENCY BACKFILL COMPLETE. System state restored.");
  } catch (err) {
    console.error("\n❌ BACKFILL FAILED:", err);
    process.exit(1);
  }
}

runBackfill().catch(console.error);
