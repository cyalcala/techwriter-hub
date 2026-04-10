import { supabase } from "../../packages/db/supabase";
import { db } from "@va-hub/db";
import { opportunities } from "@va-hub/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function nuclearPlater() {
  console.log("🕵️‍♂️ [RECOVERY] Investigating the 'Shadow Plated' anomaly...");

  // 1. Fetch all PLATED/PROCESSED jobs from the last 24h in Supabase
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: supabaseJobs, error } = await supabase
    .from("raw_job_harvests")
    .select("*")
    .in("status", ["PLATED", "PROCESSED"])
    .gte("updated_at", yesterday);

  if (error || !supabaseJobs) {
    console.error("❌ Failed to query Supabase:", error?.message);
    process.exit(1);
  }

  console.log(`📡 Found ${supabaseJobs.length} potential signals in Supabase.`);

  let restored = 0;
  let skipped = 0;

  for (const job of supabaseJobs) {
    try {
      // Re-calculate MD5
      let payload;
      let raw_title = "Unknown";
      let raw_company = "Unknown";

      try {
          if (job.mapped_payload) {
             payload = job.mapped_payload;
             raw_title = payload.title || payload.raw_title || "Unknown";
             raw_company = payload.company || payload.raw_company || "Unknown";
          } else {
             // FALLBACK: Parse raw_payload
             try {
                payload = JSON.parse(job.raw_payload);
                raw_title = payload.title || payload.raw_title || "Unknown";
                raw_company = payload.company || payload.raw_company || "Unknown";
             } catch (e) {
                // IT'S RAW HTML OR TITLE
                const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
                const raw = job.raw_payload || "";
                raw_title = cleanText(raw.split('|')[0]?.trim() || raw.split('\n')[0]?.trim() || "Unknown");
                if (raw_title.includes('<') || raw_title.includes('html') || raw_title.length < 10) {
                    console.warn(`⚠️ Skipped ${job.id}: Title failed strict validation (${raw_title.substring(0, 20)}...)`);
                    continue;
                }
                if (raw_title.length > 100) raw_title = raw_title.slice(0, 97) + "...";
                raw_company = job.source_platform || "Staged Signal";
                payload = { title: raw_title, company: raw_company, description: raw.slice(0, 1000) };
             }
          }
      } catch (e) {
          console.warn(`⚠️ Skipped ${job.id}: Invalid Payload Format`);
          continue;
      }

      const md5_hash = crypto
        .createHash("md5")
        .update((raw_title + raw_company).toLowerCase().trim())
        .digest("hex");

      // Check if exists in Turso
      const existing = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.md5_hash, md5_hash));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Restore to Turso
      console.log(`📀 Restoring missing job: ${raw_title} [${md5_hash}]`);
      
      await db.insert(opportunities).values({
        id: crypto.randomUUID(),
        md5_hash,
        title: raw_title,
        company: raw_company,
        url: job.source_url,
        description: payload.description || "Recovered signal",
        salary: payload.salary || null,
        niche: payload.niche || "VA_SUPPORT",
        type: payload.type || "direct",
        locationType: payload.locationType || "remote",
        sourcePlatform: `V12 Recovery (${job.source_platform})`,
        scrapedAt: new Date(),
        isActive: true,
        tier: payload.tier ?? 3,
        relevanceScore: payload.relevanceScore ?? 50,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify({ ...payload.metadata, recovered: true }),
      });

      restored++;
    } catch (err: any) {
      console.error(`❌ Error restoring ${job.id}:`, err.message);
    }
  }

  console.log("\n--- RECOVERY COMPLETE ---");
  console.log(`✅ Restored: ${restored} jobs`);
  console.log(`⏭️  Skipped (Existing): ${skipped} jobs`);
  process.exit(0);
}

nuclearPlater();
