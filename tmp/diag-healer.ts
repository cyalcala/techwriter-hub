import { healBatchWithLLM } from "../jobs/lib/autonomous-harvester.ts";
import { createDb } from "./packages/db/client";

async function diag() {
  const { db } = createDb();
  console.log("--- Matrix A: Healer Diagnostic ---");
  
  const rawJson = { 
    results: [
      { id: 1, name: "Remote Assistant", url: "https://example.com/1" },
      { id: 2, name: "Data Entry Specialist", url: "https://example.com/2" }
    ] 
  };
  
  console.log("Testing Slow Path Loop (Self-Correction Simulation)");
  
  const start = Date.now();
  await healBatchWithLLM(db, rawJson, "diag-source-1");
  const end1 = Date.now();
  console.log(`Call 1 duration: ${end1 - start}ms`);
  
  await healBatchWithLLM(db, rawJson, "diag-source-1");
  const end2 = Date.now();
  console.log(`Call 2 duration: ${end2 - end1}ms (Should include 4s throttle)`);
  
  if (end2 - end1 >= 4000) {
    console.log("✅ RPM Shield Active.");
  } else {
    console.log("❌ RPM Shield Failed.");
  }
}

diag();
