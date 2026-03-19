import { NextResponse } from "next/server";
import { db, opportunities } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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
      isFaithful: allActive.length >= 200, 
      isStale: stalenessHrs > 6
    };

    if (!diagnostics.vitals.isFaithful || diagnostics.vitals.isStale) {
      diagnostics.status = "DEGRADED ⚠️";
    }

  } catch (err: any) {
    diagnostics.status = "CRITICAL ❌";
    diagnostics.error = err.message;
  }

  return NextResponse.json(diagnostics, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
