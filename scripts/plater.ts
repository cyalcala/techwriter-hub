import { supabase } from '../packages/db/supabase';
import { db } from '../packages/db/client';
import { opportunities } from '../packages/db/schema';
import { OpportunitySchema } from '../packages/db/validation';
import crypto from 'node:crypto';

/**
 * V12 SIFTER: The Plater (Conveyor Belt)
 * 
 * Role: 
 * 1. Pull PROCESSED jobs from Supabase.
 * 2. Validate and De-duplicate.
 * 3. Plate them into Turso.
 * 4. Update Supabase to PLATED.
 */

async function plateFinishedMeals() {
  console.log('🍽️ [PLATER] Starting conveyor belt...');

  // 1. Fetch PROCESSED jobs
  const { data: meals, error } = await supabase
    .from('raw_job_harvests')
    .select('*')
    .eq('status', 'PROCESSED')
    .limit(20);

  if (error || !meals || meals.length === 0) {
    console.log('🍽️ [PLATER] Pantry is empty of finished meals.');
    return;
  }

  console.log(`🍽️ [PLATER] Found ${meals.length} meals to plate.`);

  for (const meal of meals) {
    try {
      const extraction = JSON.parse(meal.raw_payload);
      
      // 2. MD5 Idempotency Shield (De-duplication)
      const md5_hash = crypto
        .createHash('md5')
        .update((extraction.title + (extraction.company || 'Unknown')).toLowerCase().trim())
        .digest('hex');

      // 3. Prepare Gold Data
      const goldData = {
        id: crypto.randomUUID(),
        md5_hash,
        title: extraction.title,
        company: extraction.company || 'Confidential',
        url: meal.source_url,
        description: extraction.description,
        salary: extraction.salary,
        niche: extraction.niche,
        type: extraction.type || 'agency',
        locationType: extraction.locationType || 'remote',
        sourcePlatform: meal.source_platform || 'V12 Sifter',
        scrapedAt: new Date(),
        isActive: true,
        tier: extraction.tier ?? 3,
        relevanceScore: extraction.relevanceScore ?? 50,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify({ ...extraction.metadata, v12: true })
      };

      // 4. Validate before plating
      const validated = OpportunitySchema.safeParse(goldData);
      if (!validated.success) {
        console.error(`🍽️ [PLATER] Rejected ${meal.source_url}:`, validated.error.format());
        await supabase.from('raw_job_harvests').update({ status: 'FAILED', error_log: 'Schema Validation Failed' }).eq('id', meal.id);
        continue;
      }

      // 5. Plate to Turso (On conflict skip)
      // Note: Upstream de-duplication happens here
      await db.insert(opportunities).values([validated.data as any]).onConflictDoNothing();

      // 6. Mark as PLATED
      await supabase.from('raw_job_harvests').update({ status: 'PLATED' }).eq('id', meal.id);
      console.log(`🍽️ [PLATER] Plated: ${extraction.title}`);

    } catch (err: any) {
      console.error(`🍽️ [PLATER] Error processing meal ${meal.id}:`, err.message);
    }
  }
}

// Global invocation (for Bun/Node runner)
plateFinishedMeals()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
