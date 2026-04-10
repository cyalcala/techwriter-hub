import { claimRawJob, supabase } from "../packages/db/supabase";
import { AIMesh } from "../packages/ai/ai-mesh";
import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import crypto from "crypto";

/**
 * 👨‍🍳 V12 PANTRY CHEF (Batch Edition)
 * 
 * Role: 
 * 1. Claim RAW jobs from Supabase in batches.
 * 2. Process with AI Mesh (Vector 1 + OpenRouter Rotation).
 * 3. Enforce Phosphorus Shield (Geo-Exclusion).
 * 4. Plate to Turso Gold Vault.
 */

async function runChef(batchSize: number = 10) {
  console.log(`👨‍🍳 [CHEF] Starting batch processing (Size: ${batchSize})...`);

  const jobs = await claimRawJob("manual-chef-batch", batchSize);
  if (!jobs || jobs.length === 0) {
    console.log("📭 Pantry is empty of RAW jobs.");
    return;
  }

  console.log(`👨‍🍳 [CHEF] Claimed ${jobs.length} jobs. Starting extraction...`);

  for (const job of jobs) {
    try {
      console.log(`\n--- Processing: ${job.source_platform} [${job.id}] ---`);
      
      // AI Extraction (Bypasses Trigger.dev limit)
      const extraction = await AIMesh.extract(job.raw_payload);
      
      // 🛡️ PHOSPHORUS SHIELD
      if (!extraction.isPhCompatible || extraction.tier === 4) {
        console.log(`🛡️ [SHIELD] Dropped: ${extraction.title} (Reason: ${!extraction.isPhCompatible ? 'Geo' : 'Quality'})`);
        await supabase
          .from('raw_job_harvests')
          .update({ 
            status: 'PROCESSED', 
            triage_status: 'REJECTED',
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        continue;
      }

      // 📀 PLATING
      const md5_hash = crypto
        .createHash("md5")
        .update((extraction.title || '') + (extraction.company || ''))
        .digest("hex");

      await db.insert(opportunities).values({
        id: crypto.randomUUID(),
        md5_hash,
        title: extraction.title,
        company: extraction.company || 'Confidential',
        url: job.source_url,
        description: extraction.description,
        salary: extraction.salary || null,
        niche: extraction.niche,
        type: extraction.type || 'direct',
        locationType: extraction.locationType || 'remote',
        sourcePlatform: `V12 Chef (${job.source_platform})`,
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier,
        relevanceScore: extraction.relevanceScore,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify(extraction.metadata || {}),
      }).onConflictDoNothing();

      await supabase
        .from('raw_job_harvests')
        .update({ 
          status: 'PLATED', 
          triage_status: 'PASSED',
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      console.log(`✅ [PLATED] ${extraction.title}`);

    } catch (err: any) {
      console.error(`❌ [ERROR] Failed to process ${job.id}:`, err.message);
      await supabase
        .from('raw_job_harvests')
        .update({ status: 'FAILED', locked_by: null, error_log: err.message })
        .eq('id', job.id);
    }
  }

  console.log("\n👨‍🍳 [CHEF] Batch complete.");
}

// Run multiple batches if needed
async function main() {
  const BATCHES = 10; // Total 100 jobs for this pulse
  for (let i = 0; i < BATCHES; i++) {
    console.log(`\n--- BATCH ${i+1}/${BATCHES} ---`);
    await runChef(10);
  }
}

main().catch(console.error);
