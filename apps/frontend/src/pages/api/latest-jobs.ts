import type { APIRoute } from 'astro';
import { db, schema } from '@va-hub/db';
import { desc } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  try {
    const latestOpportunities = await db.select()
      .from(schema.opportunities)
      .orderBy(desc(schema.opportunities.lastSeenAt))
      .limit(10);

    return new Response(JSON.stringify({
      count: latestOpportunities.length,
      jobs: latestOpportunities.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        lastSeenAt: job.lastSeenAt,
        scrapedAt: job.scrapedAt
      }))
    }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
