import { harvest } from "./jobs/scrape-opportunities";
import { recordHarvestSuccess } from "./packages/db/governance";

async function kickstart() {
  console.log("🚀 [APEX] Initiating Root-Level Kickstart...");
  
  try {
    const result = await harvest({ 
      runnerId: "manual-captain-root",
      targetRegion: "Philippines" 
    });
    
    console.log("✅ [APEX] Harvest Result:", result);
    
    if (result.emitted > 0) {
       await recordHarvestSuccess("manual-captain", "Philippines");
       console.log("📡 [APEX] Consensus Pulse Updated. UI should now trigger toast.");
    } else {
       console.log("🚥 [APEX] Harvest cycle completed, but no new pulses were found. Checking AI providers...");
    }
  } catch (err) {
    console.error("❌ [APEX] Kickstart failed:", err);
  }
}

kickstart();
