import { schedules, logger } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";

/**
 * 🛰️ AUTONOMOUS APEX SRE SENTINEL
 * 
 * This job executes the Apex SRE Interrogator Suite on a regular basis.
 * It handles both Hourly (Staleness/Health) and Daily (Performance/Growth) audits.
 * 
 * The suite includes:
 * 1. Deterministic Triage (Detect & Fix)
 * 2. 10-Gate Zero-Trust Certification
 * 3. Agentic Remediation (Gemini 1.5 Flash) if gates fail.
 * 4. Wisdom Bank updates for long-term "learning".
 */

// 1. 15-MINUTE EVOLUTION & HEALTH GUARD
export const fifteenMinSreTask = schedules.task({
  id: "apex-sre-15min",
  cron: "*/15 * * * *", // Every 15 minutes
  maxDuration: 300,  // 5 mins limit for hourly check
  run: async () => {
    logger.info("[apex-sre] Initiating Hourly Autonomous Health Audit...");
    try {
      // Execute the bun script. It handles its own quota and logic.
      const stdout = execSync("bun run scripts/apex-sre.ts").toString();
      logger.info(stdout);
      return { status: "SUCCESS", output: stdout };
    } catch (error: any) {
      logger.error(`[apex-sre] Hourly Audit Failed: ${error.message}`);
      if (error.stdout) logger.error(error.stdout.toString());
      throw error;
    }
  },
});

// 2. DAILY PERFORMANCE & GROWTH STRATEGY
export const dailySreTask = schedules.task({
  id: "apex-sre-daily",
  cron: "30 0 * * *", // 00:30 UTC daily
  maxDuration: 600,    // 10 mins for deeper daily audit
  run: async () => {
    logger.info("[apex-sre] Initiating Daily Strategic Performance & Growth Audit...");
    try {
      // For the daily audit, we might want to pass a flag if we add more daily-specific logic.
      // For now, the standard suite with enhanced triage is sufficient.
      const stdout = execSync("bun run scripts/apex-sre.ts").toString();
      logger.info(stdout);
      return { status: "SUCCESS", output: stdout };
    } catch (error: any) {
      logger.error(`[apex-sre] Daily Audit Failed: ${error.message}`);
      if (error.stdout) logger.error(error.stdout.toString());
      throw error;
    }
  },
});
