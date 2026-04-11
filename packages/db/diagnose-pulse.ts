import { db } from "./packages/db";
import { vitals } from "./packages/db/schema";
import { eq } from "drizzle-orm";

async function diagnose() {
  console.log("🩺 [APEX] Diagnosing System Pulse...");
  
  const allVitals = await db.select().from(vitals);
  console.table(allVitals);
  
  const now = Date.now();
  
  allVitals.forEach(v => {
    if (v.id.startsWith('HEARTBEAT')) {
      const ageMs = now - (v.lastHarvestAt?.getTime() || 0);
      const ageMin = Math.floor(ageMs / 60000);
      console.log(`🚥 Region ${v.id}: Engine '${v.lastHarvestEngine}' held seat ${ageMin}m ago.`);
      
      if (ageMin > 25 && v.lockStatus === 'BUSY') {
        console.warn(`⚠️ [STALE LOCK] Engine '${v.lastHarvestEngine}' has likely CRASHED while holding the seat.`);
      }
    }
  });
}

diagnose();
