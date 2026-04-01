import { mapTitleToDomain, extractDisplayTags, JobDomain } from "./taxonomy";

const testCases = [
  { title: "Product Designer", domain: JobDomain.DESIGN_UX },
  { title: "Virtual Assistant (Philippines)", domain: JobDomain.VA_SUPPORT, tag: "PH-DIRECT" },
  { title: "Copywriter", domain: JobDomain.WRITING_CONTENT },
  { title: "Operations Manager", domain: JobDomain.ADMIN_OPS },
  { title: "Account Executive", domain: JobDomain.SALES_GROWTH },
  { title: "Staff Pharmacist", domain: JobDomain.SPECIALIZED },
  { title: "Bookkeeper", domain: JobDomain.FINANCE_ACCOUNTS },
  { title: "AI Training Specialist", domain: JobDomain.AI_DATA },
  { title: "Customer Service Representative (Voice)", domain: JobDomain.BPO_SERVICES }
];

console.log("══ Taxonomy Engine Audit ══");
let passed = 0;

for (const tc of testCases) {
  const domain = mapTitleToDomain(tc.title);
  const tags = extractDisplayTags(tc.title, "");
  
  const isCorrect = domain === tc.domain;
  const hasTag = tc.tag ? tags.includes(tc.tag) : true;

  if (isCorrect && hasTag) {
    console.log(`[PASS] "${tc.title}" -> ${domain}`);
    passed++;
  } else {
    console.log(`[FAIL] "${tc.title}" -> GOT: ${domain} | EXPECTED: ${tc.domain}`);
  }
}

console.log(`\nAudit Complete: ${passed}/${testCases.length} Passed.`);
process.exit(passed === testCases.length ? 0 : 1);
