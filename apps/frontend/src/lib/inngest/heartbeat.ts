import { inngest } from "./client";
import { db } from "../../../../../packages/db";
import { opportunities } from "../../../../../packages/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import * as cheerio from "cheerio";

/**
 * 🛰️ VECTOR 5: THE CHRONOS HEARTBEAT
 * Ported from scripts/semantic-heartbeat.ts
 * Mandate: Active staleness triage via Inngest background mesh.
 */
export const chronosHeartbeat = inngest.createFunction(
  { 
    id: "chronos-heartbeat", 
    name: "Chronos Heartbeat (Vector 5)",
    triggers: [{ cron: "*/30 * * * *" }] // Every 30 minutes
  },
  async ({ step }) => {
    const LIMIT = 50;
    
    const pending = await step.run("fetch-triage-targets", async () => {
      return await db.select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.isActive, true), 
            isNotNull(opportunities.url)
          )
        )
        .limit(LIMIT);
    });

    if (pending.length === 0) return { status: "IDLE", reason: "No active signals for triage." };

    for (const opp of pending) {
      await step.run(`triage-job-${opp.id}`, async () => {
        try {
          const response = await fetch(opp.url!, { 
            headers: { "User-Agent": "VA-Hub-Maintenance-Ship/V12" },
            signal: AbortSignal.timeout(10000)
          });

          if (response.status === 404) {
             await db.update(opportunities)
              .set({ 
                 isActive: false, 
                 metadata: JSON.stringify({ 
                   ...(JSON.parse(opp.metadata as string || '{}')), 
                   triageReason: "HTTP_404_NOT_FOUND", 
                   triagedAt: new Date().toISOString() 
                 }) 
              })
              .where(eq(opportunities.id, opp.id));
             return { id: opp.id, status: "ARCHIVED", reason: "404" };
          }

          // Optional: Could add LLM check here if Cerebras key is available in this env
          // For now, 404 check is the primary "Titanium" signal.
          
          return { id: opp.id, status: "ACTIVE" };
        } catch (err: any) {
          return { id: opp.id, status: "ERROR", message: err.message };
        }
      });
      
      // Delay to avoid flooding job boards
      await new Promise(r => setTimeout(r, 1000));
    }

    return { processed: pending.length, timestamp: Date.now() };
  }
);
