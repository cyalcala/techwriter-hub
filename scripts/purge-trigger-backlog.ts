// SRE MAINTENANCE: Trigger.dev Backlog Purge (V12)
const SECRET_KEY = "tr_prod_6HUNgpyEeESzSQ66VmSE";
const PROJECT_ID = "proj_hzeuykzmhlzwmqeljfft";
const BASE_URL = "https://api.trigger.dev/api/v1";

async function cleanup() {
  console.log("🧬 Starting Trigger.dev SRE Purge...");

  try {
    // 1. List Delayed/Queued Runs
    const listRes = await fetch(`${BASE_URL}/projects/${PROJECT_ID}/runs?statuses=delayed&statuses=queued&statuses=scheduled&limit=100`, {
      headers: { "Authorization": `Bearer ${SECRET_KEY}` }
    });

    if (!listRes.ok) {
       console.error(`Failed to list runs: ${listRes.status} ${await listRes.text()}`);
       return;
    }

    const { data: runs } = await listRes.json();
    console.log(`Found ${runs.length} queued/delayed runs.`);

    if (runs.length === 0) {
      console.log("No backlogged runs found. Dashboard is clean.");
      return;
    }

    // 2. Surgical Cancellation
    let cancelledCount = 0;
    for (const run of runs) {
      const cancelRes = await fetch(`${BASE_URL}/runs/${run.id}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SECRET_KEY}` }
      });

      if (cancelRes.ok) {
        cancelledCount++;
        if (cancelledCount % 10 === 0) console.log(`Cancelled ${cancelledCount} runs...`);
      }
    }

    console.log(`✅ SUCCESS: Cancelled ${cancelledCount} backlog runs.`);
  } catch (err) {
    console.error("SRE Purge Failed:", err);
  }
}

cleanup();
