/**
 * 🛰️ VA-HUB: SILENT OPS PROVISIONER
 * 
 * Surgically primes the /noteslog and verifies the Watchdog Audit vector.
 */
import { createDb } from "../packages/db/client";
import { noteslog } from "../packages/db/schema";
import { v4 as uuidv4 } from "uuid";

async function provisionVitals() {
  const { db, client } = createDb();
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://va-freelance-hub-web.vercel.app";
  
  console.log("══ Initiating Silent Ops Provisioning ══");
  
  try {
    // 1. Audit Probe (Verification)
    console.log(`[probe] Targeting Edge Audit: ${siteUrl}/api/health`);
    const response = await fetch(`${siteUrl}/api/health`);
    const data = await response.json();
    const drift = Math.round((data.vitals?.ingestionStalenessHrs ?? 0) * 60);
    console.log(`[probe] Current Edge Drift: ${drift} minutes`);

    // 2. Ledger Priming (Silicon Truth)
    console.log("[ledger] Committing Initial Watchdog Vector...");
    await db.insert(noteslog).values({
      id: uuidv4(),
      driftMinutes: drift,
      actionsTaken: "SYSTEM_UPGRADE_PROVISIONED",
      status: "success",
      metadata: JSON.stringify({
        provisionedAt: new Date().toISOString(),
        siteUrl,
        initialAudit: data
      }),
      timestamp: new Date()
    });
    
    console.log("══ Silent Ops Successfully Provisioned ══");
  } catch (err: any) {
    console.error("🛑 Provisioning Failed:", err.message);
  } finally {
    await client.close();
  }
}

provisionVitals();
