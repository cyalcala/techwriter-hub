import { harvest } from "../jobs/scrape-opportunities";

async function test() {
  console.log("=== LOCAL HARVEST TEST ===");
  try {
    const result = await harvest();
    console.log("RESULT:", JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error("HARVEST_FAILED:", e.message);
  }
}

test();
