import { serve } from "inngest/astro";
import { inngest } from "../../lib/inngest/client";
import { jobHarvested } from "../../lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    jobHarvested,
  ],
});
