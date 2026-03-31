import { tasks } from "@trigger.dev/sdk/v3";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ESM __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

async function emergencyRemediate() {
  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  
  console.log("══ Emergency Drift Remediation ══");

  // 1. Defibrillate (Vercel)
  if (deployHook) {
    console.log("[remedy] Triggering Vercel Cache Bust (Deploy Hook)...");
    const res = await fetch(deployHook, { method: "POST" });
    console.log(`[remedy] Vercel Response: ${res.status}`);
  } else {
    console.warn("[remedy] VERCEL_DEPLOY_HOOK_URL missing in .env");
  }

  // 2. Kickstart (Trigger.dev)
  console.log("[remedy] Triggering Harvester via Trigger.dev...");
  try {
    const handle = await tasks.trigger("harvest-opportunities", { 
      source: "emergency-manual-remediation",
      reason: "13-hour horizontal drift bypass"
    });
    console.log(`[remedy] Harvester Task Triggered: ${handle.id}`);
  } catch (err: any) {
    console.error(`🛑 Trigger.dev Task Failed: ${err.message}`);
  }

  console.log("══ Emergency Signal Sent ══");
}

emergencyRemediate();
