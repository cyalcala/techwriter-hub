import { silentWatchdogTask } from "../jobs/silent-watchdog";

async function testWatchdog() {
  console.log("══ Force-Triggering Autonomous Remediation ══");
  
  // Call the run function directly from the task definition
  const result = await (silentWatchdogTask as any).run();
  
  console.log("Remediation Complete:");
  console.log(JSON.stringify(result, null, 2));
}

testWatchdog();
