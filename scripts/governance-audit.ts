import { db } from "../packages/db/client";
import { vitals } from "../packages/db/schema";

async function auditVitals() {
  console.log("🕵️ [GOVERNANCE] Checking V12 Sifter Circuit Breaker...");
  
  try {
    const data = await db.select().from(vitals);
    console.log("📊 Vitals State:", JSON.stringify(data, null, 2));

    if (data.length === 0) {
      console.warn("⚠️ [GOVERNANCE] No vitals found! Initializing default state...");
      return;
    }

    const { triggerCreditsOk, lockStatus } = data[0];
    
    if (triggerCreditsOk) {
      console.log("✅ [GOVERNANCE] Trigger.dev Credits: OK");
    } else {
      console.warn("🚫 [GOVERNANCE] Trigger.dev Credits: EXHAUSTED (Circuit Breaker Active)");
    }

    if (lockStatus === 'IDLE') {
      console.log("✅ [GOVERNANCE] Pipeline Lock: IDLE");
    } else {
      console.warn(`⏳ [GOVERNANCE] Pipeline Lock: ${lockStatus}`);
    }

  } catch (err: any) {
    console.error(`🔴 [GOVERNANCE] FAILED to read Vitals:`, err.message);
  }
}

auditVitals();
