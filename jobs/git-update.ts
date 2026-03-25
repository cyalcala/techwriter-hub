import { task, logger } from "@trigger.dev/sdk/v3";
import { GitAgent } from "../scripts/lib/git-agent";
import { BudgetShield } from "../scripts/lib/budget-shield";

/**
 * 📦 TRIGGER.DEV GIT UPDATE AGENT
 */

export const gitUpdate = task({
  id: "git-update",
  run: async (payload: { message: string; files?: string[]; errorHash?: string }) => {
    logger.info("Starting autonomous git update...", { payload });

    const agentId = "trigger_dev_agent";
    const agent = new GitAgent({ agentId });
    const budget = new BudgetShield({ agentId });

    // 1. Budget & Stability Check
    if (!await budget.checkAiQuota()) return { status: "BUDGET_EXCEEDED" };
    if (payload.errorHash && !await budget.validateStability(payload.errorHash)) {
      return { status: "LOOP_TRIGGERED" };
    }

    // 2. Acquire global lock
    const locked = await agent.acquireLock();
    if (!locked) {
      logger.error("Git lock acquisition failed. Another agent is likely pushing.");
      throw new Error("GIT_LOCK_CONFLICT");
    }

    try {
      // 2. Setup environment
      await agent.setupGit();

      // 3. Execute safe push
      const success = await agent.safePush(payload.message || "trigger(auto): architectural update");

      if (success) {
        await budget.reportSuccess();
        logger.info("Autonomous git update successful! ✅");
        return { status: "success" };
      } else {
        logger.error("Autonomous git update failed during push or certification.");
        return { status: "failure" };
      }
    } finally {
      // 4. Always release lock
      await agent.releaseLock();
    }
  },
});
