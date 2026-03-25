import { task, schedules } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";
import { createLog } from "../../db/logger";

export const snapshotTask = task({
  id: "system-snapshot-v1",
  run: async (payload: any) => {
    console.log("Initiating 15-Minute Automated Snapshot...");
    
    try {
      // Execute the save script in automated mode
      // We use absolute path to be safe in different environments
      const output = execSync("bun run scripts/save.ts --automated", { 
        cwd: process.cwd(),
        encoding: 'utf-8' 
      });
      
      console.log(output);
      return { success: true, timestamp: new Date() };
    } catch (e) {
      await createLog(`Snapshot Failed: ${e.message}`, 'error');
      throw e;
    }
  },
});

export const snapshotSchedule = schedules.create({
  task: snapshotTask.id,
  cron: "*/15 * * * *", // Every 15 minutes
  deduplicationKey: "quarterly-snapshot-v1",
});
