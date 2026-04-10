import "dotenv/config";
import { AIMesh } from "../packages/ai/ai-mesh";

async function checkAI() {
  console.log("🛡️ [AI-AUDIT] Initiating Provider Health Check...");
  
  const testHtml = "<h1>Virtual Assistant Job</h1><p>We are looking for a VA in the Philippines. Salary: $1000/mo.</p>";
  
  try {
    const result = await AIMesh.extract(testHtml);
    console.log("✅ [SUCCESS] AI Mesh is functional.");
    console.log("🤖 Model used:", result.metadata?.model);
    console.log("✨ Title:", result.title);
  } catch (err: any) {
    console.error("❌ [FAILURE] AI Mesh is broken:", err.message);
  }
}

checkAI();
