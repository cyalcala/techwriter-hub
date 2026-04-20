import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { or, like } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

async function purgeNoise() {
  console.log("🧹 [PURGE] Identifying and removing noise from Gold Vault...");
  
  // Use the local D1 binding or environment variable if available
  // For remote execution, we rely on the D1 HTTP API or Wrangler
  console.log("⚠️ This script is configured to identify patterns. For D1, we will use 'wrangler d1 execute'.");
  
  const noisePatterns = [
    "%chemist%",
    "%biologist%",
    "%pharmacist%",
    "%medical%",
    "%nurse%",
    "%doctor%",
    "%virtual assistant%",
    "%data entry%",
    "%sales%",
    "%accountant%"
  ];

  const sql = `DELETE FROM opportunities WHERE ${noisePatterns.map(p => `title LIKE '${p}' OR description LIKE '${p}'`).join(' OR ')}`;
  
  console.log("📝 SQL Generated:");
  console.log(sql);
}

purgeNoise();
