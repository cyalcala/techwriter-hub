import { schedules } from "@trigger.dev/sdk/v3";

export const isolatedPing = schedules.task({
  id: "isolated-ping",
  cron: "*/5 * * * *",
  run: async () => {
    console.log("[isolated-ping] Poking ntfy...");
    try {
      await fetch("https://ntfy.sh/va-freelance-hub-task-log-cyrus", {
        method: "POST",
        body: `[ISOLATED-PING] PONG: ${new Date().toISOString()}`,
      });
    } catch (e: any) {
      console.error(`[isolated-ping] Failed: ${e.message}`);
    }
  },
});
