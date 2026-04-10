import { supabase } from "../packages/db/supabase";
import crypto from "crypto";

async function auditSupabase() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: supabaseJobs, error } = await supabase
    .from("raw_job_harvests")
    .select("*")
    .in("status", ["PLATED", "PROCESSED"])
    .gte("updated_at", yesterday);

  if (error || !supabaseJobs) {
    console.error("Error:", error);
    return;
  }

  console.log(`📡 Total Supabase Jobs: ${supabaseJobs.length}`);
  
  const hashes = new Set();
  const urls = new Set();
  supabaseJobs.forEach(job => {
      let payload;
      let raw_title = "Unknown";
      let raw_company = "Unknown";
      try {
          if (job.mapped_payload) {
             payload = job.mapped_payload;
             raw_title = payload.title || payload.raw_title || "Unknown";
             raw_company = payload.company || payload.raw_company || "Unknown";
          } else {
             payload = JSON.parse(job.raw_payload);
             raw_title = payload.title || payload.raw_title || "Unknown";
             raw_company = payload.company || payload.raw_company || "Unknown";
          }
      } catch (e) {
          raw_title = job.raw_payload?.split('|')[0]?.trim() || "Unknown";
          raw_company = job.source_platform || "Staged Signal";
      }

      const md5_hash = crypto
        .createHash("md5")
        .update((raw_title + raw_company).toLowerCase().trim())
        .digest("hex");
      
      hashes.add(md5_hash);
      if (job.source_url) urls.add(job.source_url.split('?')[0].toLowerCase().trim());
  });

  console.log(`💎 Unique Recovery Hashes: ${hashes.size}`);
  console.log(`🔗 Unique URLs: ${urls.size}`);
  process.exit(0);
}

auditSupabase();
