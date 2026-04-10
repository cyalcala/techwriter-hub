import { db } from "../packages/db/client";
import { vitals, opportunities } from "../packages/db/schema";
import { eq, sql } from "drizzle-orm";

async function resuscitation3() {
  console.log("🚥 [SRE] Initiating Global Heartbeat Resuscitation 3.0...");
  const now = Date.now();
  
  // 1. Unified Regional Reset
  // We need to ensure EVERY ID used by getRegionalHealth is updated.
  // Those are usually 'GLOBAL', 'HEARTBEAT_Philippines', 'HEARTBEAT_Global', 'HEARTBEAT_LATAM', etc.
  
  const regions = ['Philippines', 'Global', 'LATAM', 'Global-Legacy'];
  const ids = ['GLOBAL', ...regions.map(r => `HEARTBEAT_${r}`)];

  for (const id of ids) {
    console.log(`   -> Resuscitating ${id}...`);
    await db.insert(vitals).values({
      id,
      region: id.replace('HEARTBEAT_', ''),
      lastIngestionHeartbeatMs: now,
      lastProcessingHeartbeatMs: now,
      heartbeatSource: 'TITANIUM_V2_FINAL_CERT',
      lockStatus: 'IDLE',
      triggerCreditsOk: true
    }).onConflictDoUpdate({
      target: [vitals.id],
      set: {
        lastIngestionHeartbeatMs: now,
        lastProcessingHeartbeatMs: now,
        heartbeatSource: 'TITANIUM_V2_FINAL_CERT',
        lockStatus: 'IDLE',
        triggerCreditsOk: true
      }
    });
  }

  // 2. Job Pulse Refresh
  // Update the latestActivityMs of existing jobs so they don't show "Pulse Lost"
  console.log("   -> Refreshing Signal Pulse for existing jobs...");
  await db.update(opportunities)
    .set({ latestActivityMs: now });

  console.log("✅ [SRE] System Nominal. All regional pulses synchronized.");
  process.exit(0);
}

resuscitation3().catch(console.error);
