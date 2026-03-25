import { task, schedules } from "@trigger.dev/sdk/v3";
import { createLog } from "../../db/logger";
import { db, vitals } from "../../db/client";
import { eq } from "drizzle-orm";

export const heartbeatTask = task({
  id: "system-heartbeat-v1",
  run: async (payload: any) => {
    const timestamp = new Date();
    
    // 1. Log to DB
    await createLog(`System Heartbeat: OK`, 'info', { 
      triggerReason: payload.reason || 'scheduled',
      timestamp
    });

    // 2. Update Vitals
    try {
      await db.update(vitals)
        .set({ lockUpdatedAt: timestamp })
        .where(eq(vitals.id, 'apex_sre'));
    } catch (e) {
      console.error("Failed to update vitals:", e.message);
    }

    return { status: "pulsing" };
  },
});

export const heartbeatSchedule = schedules.create({
  task: heartbeatTask.id,
  cron: "* * * * *", // Every minute
  deduplicationKey: "minute-heartbeat-v1",
});
