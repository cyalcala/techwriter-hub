import { schedules, logger, tasks } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { noteslog } from "@va-hub/db/schema";
import { config } from "@va-hub/config";
import { v4 as uuidv4 } from "uuid";
import { eq, desc, gte, sql } from "drizzle-orm";

/**
 * 🕵️ SILENT AUTO-HEALER (WATCHDOG: GOLDILOCKS EDITION)
 * 
 * Pillar 4: Anomaly Detection (Zero-Signal Flatline)
 * Pillar 5: Surgical Defrost (Self-heal AI Cooldowns)
 * Pillar 6: Silent Ledger (Write to noteslog)
 */
export const silentWatchdogTask = schedules.task({
  id: "silent-watchdog",
  // cron: "*/15 * * * *", 
  maxDuration: 300,
  run: async () => {
    const { db, client } = createDb();
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://va-freelance-hub-web.vercel.app";
    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    const { slo } = config;
    
    let driftMinutes = 0;
    let actionsTaken: string[] = [];
    let status = "success";
    let metadata: any = {
        timestamp: new Date().toISOString(),
        siteUrl
    };

    try {
      logger.info(`[watchdog] Initiating Goldilocks Audit: ${siteUrl}/api/health`);

      // Pillar 1: Live Edge Audit (Force cache bypass)
      const response = await fetch(`${siteUrl}/api/health?t=${Date.now()}`, {
        headers: { 
          "Cache-Control": "no-cache",
          "User-Agent": "VA-Hub-Watchdog/3.0 (Goldilocks)"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Edge Audit HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      const healthData = await response.json();
      metadata.auditResponse = healthData;
      
      const heartbeat = healthData.vitals?.heartbeat;
      const heartbeatState = heartbeat?.state || "UNKNOWN";
      driftMinutes = Math.round((healthData.vitals?.ingestionStalenessHrs || 0) * 60);
      
      metadata.heartbeatState = heartbeatState;
      metadata.ingestionAgeMinutes = heartbeat?.ingestionAgeMinutes;
      metadata.processingAgeMinutes = heartbeat?.processingAgeMinutes;

      logger.info(`[watchdog] State: ${heartbeatState}. Drift: ${driftMinutes}m. Processing Age: ${heartbeat?.processingAgeMinutes}m.`);

      // Step 2: Cooldown Detection
      const [latestRemediation] = await db.select()
        .from(noteslog)
        .orderBy(desc(noteslog.timestamp))
        .where(eq(noteslog.status, "success"))
        .limit(1);

      let cooldownActive = false;
      if (latestRemediation) {
        const lastActionMs = new Date(latestRemediation.timestamp).getTime();
        const elapsedMin = (Date.now() - lastActionMs) / 60000;
        cooldownActive = elapsedMin < slo.remediation_cooldown_minutes;
        metadata.lastRemediationMinutesAgo = Math.round(elapsedMin);
        
        // Only consider it a relevant cooldown if an actual remediation action was taken
        const wasRealAction = latestRemediation.actionsTaken.includes("ENGINE_KICKSTART") || 
                             latestRemediation.actionsTaken.includes("VERCEL_CACHE_BUST");
        
        if (!wasRealAction) cooldownActive = false;
      }
      metadata.cooldownActive = cooldownActive;

      // Level 2: Regional Remediation (The Goldilocks surgical path)
      const regions = healthData.vitals?.regions || {};
      let remediationTriggers = 0;

      for (const [regionName, regionData] of Object.entries(regions) as any) {
        const isRegionStale = regionData.state === "STALE" || regionData.state === "SUSPECT_HEARTBEAT";
        
        if (isRegionStale && !cooldownActive) {
          logger.warn(`[watchdog] ⚠️ REGIONAL BREACH detected for ${regionName}. Triggering surgical restart.`);
          try {
            await tasks.trigger("harvest-opportunities", { 
              source: `watchdog-recovery-${regionName.toLowerCase()}`,
              region: regionName,
              heartbeatState: regionData.state
            });
            actionsTaken.push(`ENGINE_KICKSTART_${regionName.toUpperCase()}`);
            remediationTriggers++;
          } catch (taskErr: any) {
             logger.error(`[watchdog] Kickstart failed for ${regionName}: ${taskErr.message}`);
             actionsTaken.push(`KICKSTART_${regionName.toUpperCase()}_FAILED`);
          }
        }
      }

      // Level 3: Global Remediation (Fallback / Severe)
      // Only if global heartbeat is STALE or all regional restarts failed
      const needsGlobalHealing = (heartbeatState === "STALE" || driftMinutes > 120) && !cooldownActive;
      
      if (needsGlobalHealing) {
        // If we haven't triggered any specific regional restarts yet, try a global one
        if (remediationTriggers === 0) {
          try {
            await tasks.trigger("harvest-opportunities", { source: "watchdog-global-kickstart" });
            actionsTaken.push("ENGINE_KICKSTART_GLOBAL");
          } catch (err: any) {
            actionsTaken.push("KICKSTART_GLOBAL_FAILED");
          }
        }

        // VERCEL DEFIBRILLATOR (Final fallback)
        if (deployHook && (heartbeatState === "STALE" || actionsTaken.includes("KICKSTART_GLOBAL_FAILED"))) {
          try {
            await fetch(deployHook, { method: "POST" });
            actionsTaken.push("VERCEL_CACHE_BUST");
            logger.info("[watchdog] Vercel cache bust triggered.");
          } catch (hookErr: any) {
            logger.error(`[watchdog] Cache bust failed: ${hookErr.message}`);
            actionsTaken.push("VERCEL_CACHE_BUST_FAILED");
          }
        } // end if deployHook
      } // end if needsGlobalHealing

      // Pillar 4: Anomaly Detection (Zero-Signal Flatline)
      const { opportunities } = schema;
      const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentJobsResult = await db.select({ count: sql<number>`count(*)` })
        .from(opportunities)
        .where(gte(opportunities.createdAt, TWENTY_FOUR_HOURS_AGO));
      
      const jobCount = Number(recentJobsResult[0]?.count || 0);
      metadata.recentJobCount24h = jobCount;

      if (jobCount === 0 && !cooldownActive && heartbeatState === "FRESH") {
        logger.warn("[watchdog] 🕵️ ANOMALY DETECTED: Heartbeat is FRESH but 0 jobs in 24h. Triggering recovery harvest.");
        try {
          await tasks.trigger("harvest-opportunities", { source: "apex-sre-anomaly-recovery" });
          actionsTaken.push("ANOMALY_RECOVERY_TRIGGERED");
        } catch (err: any) {
          actionsTaken.push("ANOMALY_RECOVERY_FAILED");
        }
      }

      // Pillar 4: Surgical Defrost (Self-healing AI blocks)
      const { aiCooldowns } = schema;
      const blockedAI = await db.select().from(aiCooldowns).where(eq(aiCooldowns.isBlocked, true));
      
      for (const provider of blockedAI) {
        const updateAgeMin = (Date.now() - (provider.updatedAt?.getTime() || 0)) / 60000;
        if (updateAgeMin > 15) { // 15-minute soft cooldown
           logger.info(`[watchdog] ❄️ Surgically defrosting AI Provider: ${provider.providerName}`);
           await db.update(aiCooldowns)
             .set({ isBlocked: false, errorCount: 0, updatedAt: new Date() })
             .where(eq(aiCooldowns.providerName, provider.providerName));
           actionsTaken.push(`SURGICAL_DEFROST_${provider.providerName.toUpperCase()}`);
        }
      }

    } catch (err: any) {
      status = "failure";
      metadata.criticalError = err.message;
      logger.error(`[watchdog] 🛑 Watchdog failure: ${err.message}`);
    } finally {
      try {
        // Pillar 4: Silent Ledger
        await db.insert(noteslog).values({
          id: uuidv4(),
          driftMinutes,
          actionsTaken: actionsTaken.join(", "),
          status,
          metadata: JSON.stringify(metadata),
          timestamp: new Date()
        });
      } catch (logErr: any) {
        logger.error(`[watchdog] Failed to write to noteslog: ${logErr.message}`);
      }
      await client.close();
    }

    return { driftMinutes, actionsTaken, status };
  },
});
