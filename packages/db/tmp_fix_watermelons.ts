import { db, schema } from './packages/db/client';
import { sql, eq, and, or, inArray, lt } from 'drizzle-orm';

async function purgeRatholes() {
  console.log("🍉 Starting Surgical Purification...");

  try {
    // 1. Mark 0% Yield Platforms as Inactive (The Rathole Purge)
    const ratholePlatforms = ['RemoteOK', 'WeWorkRemotely', 'Jobicy', 'Reddit r/VirtualAssistant', 'Reddit r/forhire', 'Reddit r/remotejobs', 'rss'];
    
    const purgeResult = await db.update(schema.opportunities)
      .set({ isActive: false })
      .where(and(
        eq(schema.opportunities.isActive, true),
        inArray(schema.opportunities.sourcePlatform, ratholePlatforms),
        lt(schema.opportunities.tier, 1) // Don't purge if they managed to get into Titanium (unlikely based on audit)
      ));
    
    console.log(`✅ Purged rathole noise from: ${ratholePlatforms.join(', ')}`);

    // 2. Mark "Watermelons" (Ghost Jobs) as Inactive
    const watermelonResult = await db.update(schema.opportunities)
      .set({ isActive: false })
      .where(and(
        eq(schema.opportunities.isActive, true),
        sql`scraped_at < unixepoch('now', '-72 hours') * 1000`
      ));
    
    console.log(`✅ Archived stale "watermelon" signals.`);

    // 3. Final Count Check
    const finalStats = await db.select({
      total: sql<number>`count(*)`
    }).from(schema.opportunities).where(eq(schema.opportunities.isActive, true));

    console.log(`📊 Purity Restored. Active high-intent signals remaining: ${finalStats[0].total}`);

  } catch (err: any) {
    console.error("❌ Purification Failed:", err.message);
  }
}

purgeRatholes();
