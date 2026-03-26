import type { APIRoute } from 'astro';
import { db } from '@va-hub/db/client';
import { opportunities } from '@va-hub/db/schema';
import { sql, eq } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    vitals: {}
  };

  try {
    // 1. Density Audit
    const allActive = await db.select().from(opportunities).where(eq(opportunities.isActive, true));
    const tiers = {
       gold: allActive.filter(o => o.tier === 1).length,
       silver: allActive.filter(o => o.tier === 2).length,
       bronze: allActive.filter(o => o.tier === 3).length,
    };

    // 2. Pulse Audit - Unit Agnostic (handles both ms and sec)
    const stats = await db.select({
      total: sql<number>`count(*)`,
      gold: sql<number>`sum(case when tier = 1 then 1 else 0 end)`,
      newToday: sql<number>`sum(case when created_at > unixepoch('now', '-24 hours') * 1000 then 1 else 0 end)`,
      maxScraped: sql<number>`max(scraped_at)`,
      maxCreated: sql<number>`max(created_at)`,
    }).from(opportunities).where(eq(opportunities.isActive, true));

    const { total, gold, newToday, maxScraped, maxCreated } = stats[0];
    
    const lastIngestion = maxCreated ? new Date(maxCreated) : new Date(0);
    const lastHeartbeat = maxScraped ? new Date(maxScraped) : new Date(0);
      
    const ingestionStalenessHrs = (Date.now() - lastIngestion.getTime()) / (1000 * 60 * 60);
    const dbStalenessHrs = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60 * 60);

    const isFaithful = newToday > 0;

    diagnostics.vitals = {
      totalActive: total,
      goldDistribution: gold,
      lastIngestion: lastIngestion.toISOString(),
      ingestionStalenessHrs: Number(ingestionStalenessHrs.toFixed(2)),
      dbStalenessHrs: Number(dbStalenessHrs.toFixed(2)),
      isFaithful,
      isStale: ingestionStalenessHrs > 2, // 2h threshold for "Burst Mode" alignment
      dailyGrowthRate: newToday,
    };

    if (!diagnostics.vitals.isFaithful || diagnostics.vitals.isStale) {
      diagnostics.status = "DEGRADED ⚠️";
    }

  } catch (err: any) {
    diagnostics.status = "CRITICAL ❌";
    diagnostics.error = err.message;
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Surrogate-Control": "no-store",
      "X-Sentinel-Verified": "true"
    },
  });
};
