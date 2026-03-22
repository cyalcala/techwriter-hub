import { siftOpportunity } from "./jobs/lib/sifter.ts";

const LABELED_TEST_SET = [
  { label: "VA_ADMIN", title: "Virtual Assistant", company: "Remote Operations Co", desc: "Administrative support role. Philippines preferred. Full remote.", source: "reddit", expected_max_tier: 3 },
  { label: "SOCIAL_MEDIA", title: "Social Media Manager", company: "Digital Agency", desc: "Managing Instagram and Facebook accounts. Open to Filipino applicants.", source: "himalayas", expected_max_tier: 3 },
  { label: "CUSTOMER_SUPPORT", title: "Customer Support Representative", company: "SaaS Startup", desc: "Tier 1 support. Fully remote. Work from anywhere.", source: "remoteok", expected_max_tier: 3 },
  { label: "EXEC_ASSISTANT_PH", title: "Executive Assistant", company: "US Consulting Firm", desc: "Seeking EA from Philippines. Direct hire. Full time remote.", source: "reddit", expected_max_tier: 1 },
  { label: "BOOKKEEPER", title: "Bookkeeper", company: "Accounting Services", desc: "Part time remote bookkeeping. QuickBooks experience required.", source: "jobicy", expected_max_tier: 3 },
  { label: "CONTENT_WRITER", title: "Content Writer", company: "Marketing Agency", desc: "Blog posts and SEO articles. Remote. Filipino applicants welcome.", source: "himalayas", expected_max_tier: 3 },
  { label: "GRAPHIC_DESIGNER", title: "Graphic Designer", company: "Creative Studio", desc: "Social media graphics and brand assets. Remote from Philippines.", source: "reddit", expected_max_tier: 2 },
  { label: "LEAD_VA_SPECIALIST", title: "Senior Virtual Assistant", company: "Agency Partner", desc: "Lead VA managing a team of 3. Philippines-based. Remote.", source: "reddit", expected_max_tier: 2 }
];

async function run() {
  console.log("\n=== SIFTER CLASSIFICATION AUDIT ===\n");
  let falsePositives = 0;
  for (const record of LABELED_TEST_SET) {
    try {
      const tier = siftOpportunity(record.title, record.company, record.desc, record.source);
      if (tier === 4) {
        falsePositives++;
        console.log(`  FALSE POSITIVE: [${record.label}] → TRASH | "${record.title}"`);
      } else {
        console.log(`  OK [${record.label}] → Tier ${tier}`);
      }
    } catch (e: any) {
      console.log(`  ERROR [${record.label}]: ${e.message}`);
      falsePositives++;
    }
  }
  const fpRate = Math.round(falsePositives / LABELED_TEST_SET.length * 100);
  console.log(`\nFP Rate: ${fpRate}%`);
}

run();
