/**
 * V12 SIFTER: Intelligent "Kitchen Brigade" Orchestrator
 * This route manages the asynchronous processing of raw jobs from the Supabase pantry.
 */

import { Inngest } from "inngest";
import { serve } from "inngest/astro";

// 1. Initialize Inngest client
export const inngestClient = new Inngest({ id: "va-freelance-hub" });

/**
 * Chef Function: Poll the Supabase Pantry
 * Wakes up every 15 minutes, claims RAW jobs, and processes them through the Mesh.
 */
const pantryPoll = inngestClient.createFunction(
  { 
    id: "v12-pantry-chef", 
    name: "V12 Pantry Chef",
    triggers: [{ cron: "*/15 * * * *" }] 
  },
  async ({ step }) => {
    // 2. Atomic Claim from Staging Buffer
    const { claimRawJob, supabase } = await import("../../../../../packages/db/supabase");
    const jobs = await step.run("claim-untouched-jobs", async () => {
      return await claimRawJob("inngest-chef-v12", 5); // Pick 5 jobs
    });

    if (!jobs || jobs.length === 0) return { status: "empty_pantry" };

    // 3. Parallel Kitchen Processing
    const processingResults = await step.run("intelligent-processing", async () => {
      const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");
      const results = [];

      for (const job of jobs) {
        try {
          // A. Fast Triage
          const decision = await AIMesh.triage(job.raw_payload);
          
          if (decision === 'REJECTED') {
            await supabase
              .from('raw_job_harvests')
              .update({ status: 'FAILED', triage_status: 'REJECTED', error_log: 'Dropped by Edge Triage' })
              .eq('id', job.id);
            results.push({ id: job.id, status: 'rejected' });
            continue;
          }

          // B. High-Precision Extraction
          const extraction = await AIMesh.extract(job.raw_payload);
          
          // C. Ready for Plating (Update state in Supabase)
          await supabase
            .from('raw_job_harvests')
            .update({ 
              status: 'PROCESSED', 
              triage_status: 'PASSED',
              raw_payload: JSON.stringify(extraction) // Store finished JSON back in the pantry
            })
            .eq('id', job.id);
          
          results.push({ id: job.id, status: 'processed' });

        } catch (err: any) {
          await supabase
            .from('raw_job_harvests')
            .update({ status: 'FAILED', error_log: err.message })
            .eq('id', job.id);
          results.push({ id: job.id, status: 'failed', error: err.message });
        }
      }
      return results;
    });

    return { status: "cycle_complete", processed: processingResults.length };
  }
);

// 4. Export endpoint serve handlers
export const { GET, POST, PUT } = serve({ 
  client: inngestClient, 
  functions: [pantryPoll] 
});

