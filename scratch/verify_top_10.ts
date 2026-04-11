import { getSortedSignals } from "../packages/db/sorting";

async function verify() {
  const jobs = await getSortedSignals(10);
  console.log("🚀 [VERIFICATION] Top 10 Jobs (Gravity Order):");
  console.log(JSON.stringify(jobs.map(j => ({ 
    title: j.title, 
    tier: j.tier, 
    company: j.company, 
    age_h: ((Date.now() - j.latestActivityMs)/3600000).toFixed(1) + "h"
  })), null, 2));
}

verify().catch(console.error);
