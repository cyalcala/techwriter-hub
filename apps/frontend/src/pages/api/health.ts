import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    vitals: {}
  };

  try {
    const { db } = await import('@va-hub/db/client');
    const { opportunities } = await import('@va-hub/db/schema');
    const { sql, eq, desc, not } = await import('drizzle-orm');
    
    // 1. Density Audit
    const allActive = await db.select().from(opportunities).where(eq(opportunities.isActive, true));
    const tiers = {
       gold: allActive.filter(o => o.tier === 1).length,
       silver: allActive.filter(o => o.tier === 2).length,
       bronze: allActive.filter(o => o.tier === 3).length,
    };

    // 2. Pulse Audit
    const latest = await db.select({ scrapedAt: opportunities.scrapedAt })
      .from(opportunities)
      .orderBy(desc(opportunities.scrapedAt))
      .limit(1);
    
    const lastHeartbeat = latest[0]?.scrapedAt;
    const stalenessHrs = lastHeartbeat ? (Date.now() - new Date(lastHeartbeat).getTime()) / (1000 * 60 * 60) : 999;

    diagnostics.vitals = {
      totalActive: allActive.length,
      tierDistribution: tiers,
      lastHeartbeat: lastHeartbeat || "NEVER",
      stalenessHrs: Number(stalenessHrs.toFixed(2)),
      isFaithful: allActive.length >= 200, // Alert if density drops below threshold
      isStale: stalenessHrs > 6
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
      "Surrogate-Control": "no-store"
    },
  });
};
