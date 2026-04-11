import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

async function checkPlated() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("=== CHECKING PLATED JOBS (STAGING) ===\n");

  const { data, error } = await supabase
    .from("raw_job_harvests")
    .select("*")
    .eq("status", "PLATED")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Supabase Query Failed:", error);
    return;
  }

  data.forEach((r, i) => {
    const payload = typeof r.mapped_payload === 'string' ? JSON.parse(r.mapped_payload) : r.mapped_payload;
    console.log(`${i + 1}. [${r.triage_status}] ${payload?.title || r.source_url}`);
    console.log(`   Company: ${payload?.company || 'N/A'} | Region: ${r.region || 'Global'} | Source: ${r.source_platform}`);
    console.log(`   Tier: ${payload?.tier} | Niche: ${payload?.niche}`);
    console.log(`   Updated At: ${r.updated_at}`);
    console.log(`--------------------------------------------------------------------------------`);
  });
}

checkPlated().catch(console.error);
