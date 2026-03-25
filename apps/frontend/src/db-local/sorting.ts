import { db, schema } from './client';
import { desc, not, eq } from 'drizzle-orm';

// Simple in-memory cache: 15 seconds to prevent hammering Turso during traffic bursts
let cache: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 15000;

/**
 * PH-First Decay Algorithm
 * Optimized for "Snap-Fast" SSR injection.
 */
export async function getSortedSignals(limit = 50) {
  const now = Date.now();
  
  if (cache && (now - cache.timestamp) < CACHE_TTL) {
    return cache.data.slice(0, limit);
  }

  const start = Date.now();
  const candidates = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(100); // Fetch less to speed up Turso response
  
  const duration = Date.now() - start;
  if (duration > 500) console.warn(`⚠️ Slow Query: getSortedSignals took ${duration}ms`);

  const sorted = candidates
    .map(sig => {
      const now = Date.now();
      const ageMs = now - (sig.latestActivityMs || 0);
      
      // Tier Gravity: Platinum (0) is best, Bronze (3) is lowest
      const tierGravity = (sig.tier ?? 3) * 24.0;
      
      // Age Penalty: 1.0 per hour, but -12h bonus for very fresh (15m) jobs
      const agePenalty = ageMs <= 900000 ? -12.0 : ageMs / 3600000.0;
      
      // Reddit & Local Boost
      const sp = (sig.sourcePlatform || "").toLowerCase();
      let sourceBoost = 0;
      
      if (sp.includes("reddit")) {
        sourceBoost = -48.0; // Reddit is extremely high quality/local, boost by 48 hours
      } else if (["vajobsph", "phcareers", "onlinejobs", "phjobs", "kalibrr"].some(p => sp.includes(p))) {
        sourceBoost = -24.0; // Local PH platforms boost by 24 hours
      }
      
      // Support Role Boost (Pin to Top)
      const isSupport = [
        "customer service", "customer support", "client support", "support specialist", 
        "support representative", "support agent", "help desk", "live chat", "chat support",
        "customer experience", "technical support", "it support"
      ].some(s => (sig.title || "").toLowerCase().includes(s));
      
      if (isSupport) {
        sourceBoost -= 72.0; // Support roles get additional 72h boost (priority over everything)
      }
      
      return { ...sig, sortScore: tierGravity + agePenalty + sourceBoost };
    })
    .sort((a, b) => a.sortScore - b.sortScore);

  cache = { data: sorted, timestamp: now };
  return sorted.slice(0, limit);
}

/**
 * Ultra-Fast Mirror Query
 * Bypasses decay algorithm for 0ms perceived latency.
 */
export async function getLatestMirror(limit = 10) {
  const result = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
  
  return result;
}
