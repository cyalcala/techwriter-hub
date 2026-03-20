import { schedules, task, logger } from "@trigger.dev/sdk/v3";
import { createDb } from "../src/lib/db";

export const hourlySnapshot = schedules.task({
  id: "hourly-snapshot",
  cron: "0 * * * *",
  maxDuration: 120,
  queue: { concurrencyLimit: 1 },
  run: async () => {
    const { client, db } = createDb();
    try {
      logger.info("SNAPSHOT_START", {
        ts: Date.now()
      });
      
      const snapshot = {
        timestamp: new Date().toISOString(),
        type: "hourly-automated",
        trigger: "scheduled",
        system: {
          health: await captureHealth(client),
          listings: await captureListings(client),
          taskStatus: await captureTaskStatus(),
          environment: captureEnvironment()
        }
      };
      
      await client.execute({
        sql: `INSERT INTO system_snapshots 
              (snapshot_data, created_at, type)
              VALUES (?, ?, ?)`,
        args: [
          JSON.stringify(snapshot),
          new Date().toISOString(),
          "hourly"
        ]
      });
      
      logger.info("SNAPSHOT_COMPLETE", {
        timestamp: snapshot.timestamp,
        totalListings: snapshot.system.listings.total
      });
      
    } catch (err: any) {
      logger.error("SNAPSHOT_FAILED", {
        error: err.message
      });
      throw err;
    } finally {
      client.close();
    }
  }
});

async function captureHealth(client: any) {
  try {
    const r = await client.execute(
      "SELECT COUNT(*) as c FROM opportunities"
    );
    const recent = await client.execute(
      `SELECT created_at FROM opportunities
       ORDER BY created_at DESC LIMIT 1`
    );
    const count = (r.rows[0] as any).c;
    const latest = (recent.rows[0] as any)?.created_at;
    const now = new Date();
    const lastWrite = new Date(latest);
    const stalenessHrs = Math.round(
      (now.getTime() - lastWrite.getTime()) 
      / 3600000 * 100) / 100;
    return {
      status: stalenessHrs < 1 ? "HEALTHY" : "STALE",
      stalenessHrs,
      totalListings: count,
      capturedAt: now.toISOString()
    };
  } catch (err: any) {
    return { status: "ERROR", error: err.message };
  }
}

async function captureListings(client: any) {
  const tiers = await client.execute(
    `SELECT tier, COUNT(*) as count
     FROM opportunities
     GROUP BY tier`
  );
  const total = await client.execute(
    "SELECT COUNT(*) as c FROM opportunities"
  );
  return {
    total: (total.rows[0] as any).c,
    tiers: tiers.rows.reduce((acc: any, r: any) => {
      acc[r.tier] = r.count;
      return acc;
    }, {})
  };
}

async function captureTaskStatus() {
  try {
    const r = await fetch(
      "https://api.trigger.dev/api/v3/runs?limit=7",
      {
        headers: {
          "Authorization": `Bearer ${process.env.TRIGGER_SECRET_KEY}`
        }
      }
    );
    const data = await r.json();
    return (data.data || []).map((run: any) => ({
      task: run.taskIdentifier,
      status: run.status,
      lastRun: run.updatedAt
    }));
  } catch {
    return [];
  }
}

function captureEnvironment() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    capturedAt: new Date().toISOString()
  };
}
