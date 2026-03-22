import { siftOpportunity, OpportunityTier } from "./jobs/lib/sifter";

const testCases = [
  { title: "ps customer service representative", company: "tenet healthcare", platform: "Jobicy" },
  { title: "digital graphic designer (freelance)", company: "accelerate change", platform: "Jobicy" },
  { title: "graphic designer id", company: "generic", platform: "Himalayas" },
  { title: "compliance officer - north america", company: "remotecom", platform: "Greenhouse" },
  { title: "embedded sales lead", company: "", platform: "" },
];

for (const tc of testCases) {
  const tier = siftOpportunity(tc.title, "", tc.platform);
  console.log(`[${OpportunityTier[tier]}] ${tc.title} (${tc.platform})`);
}
