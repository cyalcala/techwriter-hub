import { createDb } from "../packages/db/client";
import { noteslog } from "../packages/db/schema";
import { v4 as uuidv4 } from "uuid";

async function remediate() {
    const { db, client } = createDb();
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://va-freelance-hub-web.vercel.app";
    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    
    let driftMinutes = 0;
    let actionsTaken: string[] = [];
    let status = "success";
    let metadata: any = {
        timestamp: new Date().toISOString(),
        siteUrl
    };

    console.log("══ Manual Drift Remediation ══");

    try {
      console.log(`[audit] Checking Edge: ${siteUrl}/api/health`);
      const response = await fetch(`${siteUrl}/api/health`, {
        headers: { "Cache-Control": "no-cache" }
      });
      
      const data = await response.json();
      const stalenessHrs = data.vitals?.ingestionStalenessHrs ?? 0;
      driftMinutes = Math.round(stalenessHrs * 60);

      console.log(`[audit] Drift: ${driftMinutes}m`);

      if (driftMinutes > 45) {
        console.warn(`[remedy] Drift breach detected!`);
        
        if (deployHook) {
          console.log("[remedy] Triggering Vercel Cache Bust...");
          await fetch(deployHook, { method: "POST" });
          actionsTaken.push("MANUAL_VERCEL_CACHE_BUST");
        }

        // We can't easily trigger the trigger.dev task from here without SDK setup,
        // but we'll record the intent and the user can manually run 'harvest-opportunities' 
        // if they have the dashboard open.
        // Actually, we'll try to trigger it via curl if we had the API key,
        // but let's stick to the core siteURL/Hook logic for now to unblock the UI.
        actionsTaken.push("TRIGGER_INTENT_SENTINEL");
      } else {
        console.log("[audit] Freshness within bounds.");
        actionsTaken.push("MANUAL_VERIFY_OK");
      }

    } catch (err: any) {
      status = "failure";
      metadata.error = err.message;
      console.error(`🛑 Remediation Error: ${err.message}`);
    } finally {
      await db.insert(noteslog).values({
        id: uuidv4(),
        driftMinutes,
        actionsTaken: actionsTaken.join(", "),
        status,
        metadata: JSON.stringify(metadata),
        timestamp: new Date()
      });
      console.log("[ledger] Committed results to noteslog.");
      await client.close();
    }
}

remediate();
