import { OpportunitySchema } from "../packages/db/validation";

const poisonedPayload = {
  title: "Remote Technical Support Engineer",
  company: "NKE",
  type: "full-time",
  sourceUrl: "https://himalayas.app/jobs/nke/remote-technical-support-engineer",
  sourcePlatform: "Himalayas",
  tags: ["remote", "it", "support"], // Array variant
  locationType: "remote",
  description: "Test description"
};

function testFix() {
  console.log("══ Testing Zod Resilience Fix ══");
  
  const result = OpportunitySchema.safeParse(poisonedPayload);
  
  if (result.success) {
    console.log("✅ SUCCESS: Poisoned payload normalized successfully!");
    console.log(JSON.stringify(result.data, null, 2));
    
    // Check transformations
    if (result.data.type === "direct") {
      console.log("  - 'full-time' -> 'direct' (Verified)");
    }
    if (typeof result.data.tags === "string" && result.data.tags.startsWith("[")) {
      console.log("  - Array tags -> JSON string (Verified)");
    }
  } else {
    console.error("❌ FAILURE: Resilience fix failed!");
    console.error(JSON.stringify(result.error.errors, null, 2));
  }
}

testFix();
