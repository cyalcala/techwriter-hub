import { createDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";

/**
 * VECTOR 5: THE CHRONOS HEARTBEAT (GHA Maintenance Ship)
 * Mandate: Standalone SRE script for GitHub Actions to purge staleness.
 */

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const MODEL = "qwen-3-235b-a22b-instruct-2507";
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || "50");
const DRY_RUN = process.argv.includes("--dry-run");

async function runHeartbeat() {
  if (!CEREBRAS_API_KEY) {
    console.error("❌ CEREBRAS_API_KEY is missing from environment.");
    process.exit(1);
  }

  const { db, client } = createDb();
  console.log(`\n🚢 [Vector 5] Maintenance Ship Initiated. Limit: ${LIMIT} ${DRY_RUN ? "(DRY RUN)" : ""}`);

  const pending = await db.select()
    .from(opportunities)
    .where(and(eq(opportunities.isActive, true), isNotNull(opportunities.sourceUrl)))
    .limit(LIMIT);

  console.log(`   Found ${pending.length} active opportunities to triage.`);

  let archivedCount = 0;
  let errorCount = 0;

  for (const opp of pending) {
    try {
      process.stdout.write(`   [Triage] Checking ${opp.id.substring(0,8)}... `);
      
      const response = await fetch(opp.sourceUrl!, { 
        headers: { "User-Agent": "VA-Hub-Maintenance-Ship/8.3" },
        signal: AbortSignal.timeout(10000)
      });

      if (response.status === 404) {
        process.stdout.write("404 DETECTED 🔴\n");
        if (!DRY_RUN) {
          await db.update(opportunities)
            .set({ 
               isActive: false, 
               metadata: { ...(opp.metadata as any || {}), triageReason: "HTTP_404_NOT_FOUND", triagedAt: new Date().toISOString() } 
            })
            .where(eq(opportunities.id, opp.id));
        }
        archivedCount++;
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 3000);

      const cerebrasResponse = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: "You are the Chronos Heartbeat. Determine if this job listing is 'Position Filled', 'Expired', or 'Active'. Return ONLY JSON: { result: 'active' | 'stale', reason: string }"
            },
            { role: "user", content: `Job: ${opp.title} at ${opp.company}. Content: ${bodyText}` }
          ],
          response_format: { type: "json_object" }
        }),
      });

      const triageData = await cerebrasResponse.json();
      const triage = JSON.parse(triageData.choices[0].message.content);

      if (triage.result === "stale") {
        process.stdout.write(`STALE: ${triage.reason.substring(0, 30)}... 🔴\n`);
        if (!DRY_RUN) {
          await db.update(opportunities)
            .set({ 
               isActive: false, 
               metadata: { ...(opp.metadata as any || {}), triageReason: triage.reason, triagedAt: new Date().toISOString() } 
            })
            .where(eq(opportunities.id, opp.id));
        }
        archivedCount++;
      } else {
        process.stdout.write("ACTIVE ✅\n");
      }

      // Concurrency delay (15 RPM mandate: ~4s between LLM cycles)
      await new Promise(r => setTimeout(r, 4000));
    } catch (err: any) {
      process.stdout.write(`ERROR: ${err.message} ⚠️\n`);
      errorCount++;
    }
  }

  console.log(`\n🚢 [Vector 5] Cycle Complete.`);
  console.log(`   Processed: ${pending.length} | Archived: ${archivedCount} | Errors: ${errorCount}`);
  
  await client.close();
  process.exit(0);
}

runHeartbeat().catch(err => {
  console.error("🚢 [Vector 5] CRITICAL FAILURE:", err);
  process.exit(1);
});
