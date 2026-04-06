export const prerender = false;

import { serve } from "inngest/astro";
import { Inngest } from "inngest";

// 🧬 MANUAL MANIFEST BYPASS: Titanium Core Isolation
// This bypasses the SDK's internal introspection logic to prevent "undefined triggers" crashes.
const inngest = new Inngest({ 
  id: "va-freelance-hub-v12",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * 🛰️ V12 PING
 */
const v12Ping = inngest.createFunction(
  { id: "v12-ping", name: "V12 Handshake Ping", triggers: [{ event: "v12/ping" }] },
  async ({ event, step }) => {
    return { status: "success", timestamp: new Date().toISOString() };
  }
);

/**
 * 🚜 JOB HARVESTED WORKER (V12)
 */
const jobHarvestedWorker = inngest.createFunction(
  { 
    id: "v12-job-harvested", 
    name: "Job Harvested (V12)", 
    triggers: [{ event: "v12/job.harvested" }] 
  },
  async (ctx) => {
    const { startHarvest } = await import("../../lib/ai/waterfall");
    return startHarvest(ctx);
  }
);

// 🛡️ THE APEX HANDLER: Manual Manifest Injection
const handler = serve({
  client: inngest,
  functions: [
    v12Ping,
    jobHarvestedWorker,
  ],
});

/**
 * 🛠️ MANUAL GET OVERRIDE (THE BYPASS)
 * We return a perfectly hardcoded manifest to guarantee discovery success.
 */
export const GET = async (context: any) => {
  console.log("🛰️ [SRE_V12] Handshake Discovery: Returning Manual Manifest...");
  
  // Create a minimal manifest that Inngest Cloud accepts
  const manifest = {
    name: "va-freelance-hub-v12",
    framework: "astro",
    functions: [
      {
        id: "v12-ping",
        name: "V12 Handshake Ping",
        triggers: [{ event: "v12/ping" }]
      },
      {
        id: "v12-job-harvested",
        name: "Job Harvested (V12)",
        triggers: [{ event: "v12/job.harvested" }]
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

// 🚜 MANUAL POST DISPATCH
export const POST = async (context: any) => handler.POST(context);
export const PUT = async (context: any) => handler.PUT(context);
