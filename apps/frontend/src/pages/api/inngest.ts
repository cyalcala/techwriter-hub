export const prerender = false;

import { serve } from "inngest/astro";
import { inngest } from "../../lib/inngest/client";
import { jobHarvested } from "../../lib/inngest/functions";

const handler = serve({
  client: inngest,
  functions: [
    jobHarvested,
  ],
});

export const GET = async (context: any) => handler.GET(context);
export const POST = async (context: any) => handler.POST(context);
export const PUT = async (context: any) => handler.PUT(context);

// FORCE BUILD: V12 NUCLEAR DISCOVERY ACTIVE
