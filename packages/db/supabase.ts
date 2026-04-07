import { createClient } from '@supabase/supabase-js';

/**
 * V12 SIFTER: Supabase "Chopping Board" Client
 * 
 * This client manages the RAW data staging area. 
 * High-speed ingestion (Cloudflare) -> Supabase -> AI Processing (Inngest/Trigger).
 */

export type HarvestStatus = 'RAW' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'PLATED';
export type TriageStatus = 'PENDING' | 'PASSED' | 'REJECTED';

export interface RawJobHarvest {
  id: string;
  source_url: string;
  raw_payload: string;
  source_platform: string;
  status: HarvestStatus;
  triage_status: TriageStatus;
  locked_by: string | null;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[va-hub/supabase] 🔴 CRITICAL: Missing Supabase credentials.');
  }
}

// Service role client to bypass RLS for background workers
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * UTILITY: Atomic Job Pickup
 * Prevents multiple workers from grabbing the same RAW job.
 */
export async function claimRawJob(workerId: string, limit: number = 5): Promise<RawJobHarvest[]> {
  // 1. Fetch RAW jobs that aren't locked
  const { data, error } = await supabase
    .from('raw_job_harvests')
    .select('*')
    .eq('status', 'RAW')
    .is('locked_by', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  const ids = data.map(job => job.id);

  // 2. Atomic Lock
  const { data: lockedData, error: lockError } = await supabase
    .from('raw_job_harvests')
    .update({ 
      status: 'PROCESSING', 
      locked_by: workerId,
      updated_at: new Date().toISOString() 
    })
    .in('id', ids)
    .select();

  if (lockError) {
    console.error(`[va-hub/supabase] 🔴 FAILED to lock jobs:`, lockError);
    return [];
  }

  return lockedData as RawJobHarvest[];
}
