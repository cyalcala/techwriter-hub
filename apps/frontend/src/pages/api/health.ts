import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? `SET (${process.env.TURSO_DATABASE_URL.substring(0, 30)}...)` : "MISSING ❌",
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? `SET (${process.env.TURSO_AUTH_TOKEN.substring(0, 10)}...)` : "MISSING ❌",
    },
    db: { status: "untested" },
  };

  try {
    const { db } = await import('@va-hub/db/client');
    const { agencies } = await import('@va-hub/db/schema');
    
    const result = await db.select().from(agencies).limit(1);
    diagnostics.db = {
      status: "connected ✅",
      agencyCount: result.length > 0 ? "has data" : "empty table",
      sampleName: result[0]?.name || "N/A",
    };
  } catch (err: any) {
    diagnostics.db = {
      status: "FAILED ❌",
      error: err.message,
    };
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
