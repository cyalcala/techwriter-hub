import { siftOpportunity } from "./jobs/lib/sifter.ts";

const knownGoodListings = [
  { title: "Virtual Assistant", company: "Remote Company", desc: "Looking for a VA to help with admin tasks. Remote work. Philippines.", source: "reddit" },
  { title: "Social Media Manager", company: "Digital Agency", desc: "Managing social media accounts. Open to Filipino applicants.", source: "himalayas" },
  { title: "Customer Support Representative", company: "SaaS Company", desc: "Full remote customer support role. Work from home anywhere.", source: "remoteok" },
  { title: "Executive Assistant", company: "US Executive", desc: "Direct hire from Philippines. Full time remote position.", source: "reddit" },
  { title: "Data Entry Specialist", company: "Accounting Firm", desc: "Remote data entry position. Flexible hours. Philippines preferred.", source: "jobicy" },
  { title: "Content Writer", company: "Marketing Agency", desc: "Writing blog posts and articles. Remote. Open to PH applicants.", source: "himalayas" },
  { title: "Graphic Designer", company: "Creative Studio", desc: "Designing social media graphics. Remote work from Philippines.", source: "reddit" },
  { title: "Bookkeeper", company: "Small Business", desc: "Part time bookkeeping role. QuickBooks experience needed.", source: "remoteok" }
];

async function run() {
  console.log("=== SIFTER AGGRESSION TEST ===");
  console.log("Testing known good VA listings:\n");
  
  let passed = 0;
  let trashed = 0;
  
  for (const listing of knownGoodListings) {
    try {
      const tier = siftOpportunity(listing.title, listing.company, listing.desc, listing.source);
      const tierName = tier === 1 ? "GOLD" : tier === 2 ? "SILVER" : tier === 3 ? "BRONZE" : "TRASH";
      
      if (tier === 4) {
        trashed++;
        console.log(`🚨 TRASHED: "${listing.title}"`);
      } else {
        passed++;
        console.log(`✅ ${tierName}: "${listing.title}"`);
      }
    } catch(e: any) {
      console.log(`❌ ERROR on "${listing.title}": ${e.message}`);
      trashed++;
    }
  }
  
  const aggression = Math.round(trashed / knownGoodListings.length * 100);
  console.log(`\nSIFTER VERDICT: ${aggression}% trashed (${passed}/${knownGoodListings.length} passed)`);
  
  if (aggression > 30) {
    console.log(`🚨 SIFTER TOO AGGRESSIVE: ${aggression}% are being killed silently.`);
  } else {
    console.log("✅ SIFTER OK: Within normal bounds.");
  }
}

run();
