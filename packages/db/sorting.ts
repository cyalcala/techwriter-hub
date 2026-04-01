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
  const staleBoundary = Date.now() - (48 * 60 * 60 * 1000); // 48 Hours

  // RANKING LOGIC: 
  // 1. Freshness Decay (Penalize > 48h)
  // 2. Tier (0=Platinum)
  // 3. Relevance Score
  // 4. Date
  const query = db.select()
  .from(schema.opportunities)
  .where(not(eq(schema.opportunities.tier, 4)))
  .orderBy(
    sql`CASE WHEN ${schema.opportunities.latestActivityMs} < ${staleBoundary} THEN 1 ELSE 0 END`, // Decay Penalty
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
  const staleBoundary = Date.now() - (48 * 60 * 60 * 1000); // 48 Hours

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
      sql`CASE WHEN ${schema.opportunities.latestActivityMs} < ${staleBoundary} THEN 1 ELSE 0 END`, // Decay Penalty
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
