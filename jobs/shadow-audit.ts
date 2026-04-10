import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "@va-hub/db/client";
import { opportunities, logs } from "@va-hub/db/schema";
import { AIMesh } from "@va-hub/ai/mesh";
import { sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * 🕵️ SHADOW AUDITOR (AI QUALITY ASSURANCE)
 * 
 * Goal: Detect "AI Extraction Drift" over perpetual years.
 * Rule: Pick 3 random PROCESSED jobs every 12 hours.
 * Rule: Re-extract using Gemini (The Wall).
 * Rule: Compare Tier and Niche. Log discrepancies as 'drift' signals.
 */
export const shadowAuditTask = schedules.task({
  id: "shadow-audit",
  cron: "0 */12 * * *", 
  run: async () => {
    const { db, client } = createDb();
    
    try {
      logger.info("[shadow-audit] Initiating AI Drift Audit...");

      // 1. Pick random sample
      const sample = await db.select()
        .from(opportunities)
        .orderBy(sql`RANDOM()`)
        .limit(3);

      if (sample.length === 0) {
        logger.info("[shadow-audit] No signals in vault to audit. Skipping.");
        return;
      }

      for (const job of sample) {
        try {
          // Re-sift with current mesh (Gemini fallback will likely trigger if others fail)
          const result = await AIMesh.extract(job.description); // Using description as sample payload
          
          const isDrifting = result.tier !== job.tier || result.niche !== job.niche;
          
          if (isDrifting) {
            logger.warn(`[shadow-audit] ⚠️ DRIFT DETECTED for Job: ${job.id}`);
            logger.warn(`- Old: Tier ${job.tier}, Niche ${job.niche}`);
            logger.warn(`- New: Tier ${result.tier}, Niche ${result.niche}`);

            await db.insert(logs).values({
              id: uuidv4(),
              level: 'warn',
              message: `AI_DRIFT_DETECTED: Job ${job.id} re-sifted with different results.`,
              metadata: JSON.stringify({
                jobId: job.id,
                old: { tier: job.tier, niche: job.niche },
                new: { tier: result.tier, niche: result.niche },
                model: result.metadata?.model
              })
            });
          } else {
             logger.info(`[shadow-audit] ✅ SIGNAL CONSISTENT: Job ${job.id}`);
          }
        } catch (siftErr: any) {
          logger.error(`[shadow-audit] Re-sift failed for ${job.id}: ${siftErr.message}`);
        }
      }

    } catch (err: any) {
      logger.error(`[shadow-audit] 🛑 Audit cycle failed: ${err.message}`);
      throw err;
    } finally {
      await client.close();
    }
  },
});
