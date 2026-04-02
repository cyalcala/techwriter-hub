import { siftOpportunity, OpportunityTier } from "@va-hub/core/sieve";

const testCases = [
  { title: "Virtual Assistant", company: "Remote Co", desc: "Helping with admin tasks" },
  { title: "Social Media Manager", company: "Brand X", desc: "Managing Instagram and FB" },
  { title: "Technical Support Representative", company: "Tech Inc", desc: "Helping customers with issues" },
  { title: "Executive Assistant - Filipino Talent", company: "US Exec", desc: "Direct hire from PH" },
  { title: "Senior Software Engineer", company: "Big Tech", desc: "Coding in Python" }, 
];

testCases.forEach(tc => {
  const result = siftOpportunity(tc.title, tc.desc, tc.company, "test-harness");
  console.log(`TITLE: ${tc.title.padEnd(35)} | TIER: ${OpportunityTier[result.tier]}`);
});
