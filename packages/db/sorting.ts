import { db, schema } from './client';
import { desc, not, eq, sql, and } from 'drizzle-orm';

/**
 * PH-First Decay Algorithm (SQL-Native)
 * 1. Pushes math to the Edge (Turso/LibSQL).
 * 2. Fetches only the needed 'limit' records.
 * 3. Gravity Calculation: (Tier * 24.0) + (Age in Hours)
 * 4. Freshness Boost: -12.0h if < 15min old.
 */
export async function getSortedSignals(limit = 100) {
  const now = Date.now();
  
  // RANKING LOGIC: Tier first (0=Platinum), then Relevance Score, then Date.
  const query = db.select()
  .from(schema.opportunities)
  .where(not(eq(schema.opportunities.tier, 4)))
  .orderBy(
    schema.opportunities.tier, 
    desc(schema.opportunities.relevanceScore), 
    desc(schema.opportunities.latestActivityMs)
  )
  .limit(limit);

  return await query;
}

/**
 * Domain-Specific Fetcher
 * Used to populate the functional silos in the Master Directory UI.
 */
export async function getSignalsByDomain(domain: string, limit = 20) {
  return await db.select()
    .from(schema.opportunities)
    .where(
      and(
        not(eq(schema.opportunities.tier, 4)),
        eq(schema.opportunities.isActive, true),
        sql`${schema.opportunities.tags} LIKE ${'%' + domain + '%'}`
      )
    )
    .orderBy(
      schema.opportunities.tier, 
      desc(schema.opportunities.relevanceScore), 
      desc(schema.opportunities.latestActivityMs)
    )
    .limit(limit);
}

/**
 * Latest Mirror Algorithm
 * Returns the absolute freshest signals regardless of tier.
 */
export async function getLatestMirror(limit = 10) {
  return await db.select()
    .from(schema.opportunities)
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(limit);
}
