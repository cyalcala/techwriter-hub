import { siftOpportunity, OpportunityTier } from "./lib/sifter";

const testCases = [
  // ❌ SHOULD BE TRASHED (Reported by user as problematic)
  { title: "Enterprise Customer Success Manager", source: "Greenhouse", expected: OpportunityTier.TRASH },
  { title: "Customer Success Engineer", source: "GitLab", expected: OpportunityTier.TRASH },
  { title: "Enterprise Customer Success Manager (French Speaker)", source: "Canonical", expected: OpportunityTier.TRASH },
  { title: "Enterprise Customer Success Manager (Japanese Speaker)", source: "Canonical", expected: OpportunityTier.TRASH },
  { title: "Customer Success Manager, DACH", source: "GitLab", expected: OpportunityTier.TRASH },
  { title: "Technical Product Manager", source: "RemoteOK", expected: OpportunityTier.TRASH },
  { title: "Revenue Operations Manager", source: "RemoteOK", expected: OpportunityTier.TRASH },
  { title: "Manager, Customer Success Engineer, EMEA", source: "GitLab", expected: OpportunityTier.TRASH },

  // ✅ SHOULD BE PLATINUM (Support/Elevation Roles + Explicit PH Signal OR Global Remote Support)
  { title: "Senior VA", source: "OnlineJobs", expected: OpportunityTier.PLATINUM },
  { title: "Lead Virtual Assistant", source: "OnlineJobs", expected: OpportunityTier.PLATINUM },
  { title: "Senior Customer Support", source: "OnlineJobs", expected: OpportunityTier.PLATINUM },
  { title: "Customer Service Representative", source: "OnlineJobs", expected: OpportunityTier.PLATINUM },
  { title: "Technical Support Analyst (hiring from the Philippines)", source: "Generic", expected: OpportunityTier.PLATINUM },
  { title: "Customer Support Agent (SEA Region)", source: "Generic", expected: OpportunityTier.PLATINUM },
  { title: "Customer Service Representative (Asia-based)", source: "Generic", expected: OpportunityTier.PLATINUM },
  { title: "Remote Support Specialist (Worldwide)", source: "Generic", expected: OpportunityTier.PLATINUM },
  
  // ⚠️ SHOULD BE DEPRIORITIZED (Vague Geo Signals for non-support roles)
  { title: "General Virtual Assistant (Worldwide)", source: "Generic", expected: OpportunityTier.SILVER },

  // ✅ SHOULD PASS (Standard Base Roles)
  { title: "Virtual Assistant", source: "OnlineJobs", expected: OpportunityTier.PLATINUM },
  { title: "Social Media Manager", source: "Jobicy", expected: [OpportunityTier.PLATINUM, OpportunityTier.GOLD, OpportunityTier.SILVER, OpportunityTier.BRONZE] },
  { title: "Executive Assistant", source: "Himalayas", expected: [OpportunityTier.PLATINUM, OpportunityTier.GOLD, OpportunityTier.SILVER, OpportunityTier.BRONZE] },
];

console.log("═══ Sifter Verification Run ═══");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = siftOpportunity(tc.title, "", tc.source);
  const isMatch = Array.isArray(tc.expected) ? tc.expected.includes(result) : result === tc.expected;

  if (isMatch) {
    console.log(`✅ [PASS] "${tc.title}" -> ${OpportunityTier[result]}`);
    passed++;
  } else {
    console.log(`❌ [FAIL] "${tc.title}" -> GOT: ${OpportunityTier[result]}, EXPECTED: ${Array.isArray(tc.expected) ? tc.expected.map(e => OpportunityTier[e]).join("/") : OpportunityTier[tc.expected]}`);
    failed++;
  }
}

console.log("\n═══ Results ═══");
console.log(`TOTAL: ${testCases.length}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
