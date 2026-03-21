import { siftOpportunity, OpportunityTier } from "./jobs/lib/sifter";
import { isLikelyScam } from "./jobs/lib/trust";

const testJobs = [
    { title: "Virtual Assistant", company: "Remote Co", desc: "Looking for a remote VA" },
    { title: "Digital Graphic Designer", company: "Designers", desc: "Remote role for pinoy designers" },
    { title: "Software Engineer", company: "Big Tech", desc: "Native Zig developer" },
    { title: "Technical Support", company: "HelpDesk", desc: "Remote support role" },
];

console.log("=== SIFTER TEST ===");
for (const job of testJobs) {
    const isScam = isLikelyScam(job.title, job.desc);
    const tier = siftOpportunity(job.title, job.company, job.desc);
    console.log(`Title: ${job.title}`);
    console.log(`  isScam: ${isScam}`);
    console.log(`  Tier: ${OpportunityTier[tier]} (${tier})`);
}
