import { db } from "../packages/db/client";
import { harvest } from "../jobs/scrape-opportunities";

async function force() {
  console.log("🚀 Initiating Surgical Force Harvest (AI Bypass)...");
  try {
    // Setting a fake key to at least bypass some initial checks 
    // if harvest() or its children use process.env directly.
    // process.env.GEMINI_API_KEY = "dummy_for_manual_verification";
    
    // We run the harvest and hope the non-AI sources populate the DB.
    const result = await harvest();
    console.log("✅ Force Harvest Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("❌ Force Harvest Failed Early. Ingestion still blocked.");
    console.error(err);
  }
}

force();
