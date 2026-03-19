import { siftNative, OpportunityTier } from "../packages/sifter-native/index";

const tests = [
  { title: "Virtual Assistant", company: "RemoteOps", desc: "Helping with admin tasks" },
  { title: "Senior Software Engineer", company: "TechCorp", desc: "Coding in Java" },
  { title: "Customer Link Support", company: "HelpDesk", desc: "Support roles" },
  { title: "Executive Director of Engineering", company: "BigCo", desc: "Leading teams" },
];

console.log("🚀 Benchmarking Native Sifter...");
const start = performance.now();

for (const test of tests) {
  const tier = siftNative(test.title, test.company, test.desc);
  console.log(`[${OpportunityTier[tier]}] ${test.title}`);
}

const end = performance.now();
console.log(`\n✅ 4 Items Sifted in ${(end - start).toFixed(4)}ms`);
