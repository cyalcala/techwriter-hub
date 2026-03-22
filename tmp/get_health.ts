const resp = await fetch("https://va-freelance-hub-web.vercel.app/api/health");
const data = await resp.json();
console.log(JSON.stringify({
  status: data.status,
  totalActive: data.vitals.totalActive,
  staleness: data.vitals.stalenessHrs,
  gold: data.vitals.tierDistribution.gold
}, null, 2));
