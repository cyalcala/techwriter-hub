import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";
import { eq } from "drizzle-orm";

async function refill() {
  console.log("💰 [SRE] Refilling AI budget for audit...");
  
  await db.update(vitals).set({ 
    aiQuotaCount: 200, 
    sentinelState: null,
    lastInterventionAt: new Date(),
    lastInterventionReason: "Manual SRE Refill: Audit Stabilization"
  }).where(eq(vitals.id, "GLOBAL"));

  // Also reset local regions just in case
  const regions = ["Philippines", "Global", "LATAM"];
  for (const r of regions) {
     await db.update(vitals).set({ aiQuotaCount: 200 }).where(eq(vitals.id, `HEARTBEAT_${r}`));
  }

  console.log("✅ AI Budget Refilled. Sentinel Nominal.");
  process.exit(0);
}

refill().catch(console.error);
