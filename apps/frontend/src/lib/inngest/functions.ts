import { inngest } from "./client";
import { db } from "../../../../../packages/db"; // Root packages/db
import { opportunities } from "../../../../../packages/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/**
 * job.harvested function
 * Idempotency: MD5 hash of raw_title + raw_company
 */
export const jobHarvested = inngest.createFunction(
  { 
    id: "job-harvested", 
    name: "Job Harvested",
    // Inngest v4+ uses triggers in the config object
    triggers: [{ event: "job.harvested" }]
  },
  async ({ event, step }) => {
    const { raw_title, raw_company, raw_url, raw_html } = event.data;

    // 1. Calculate MD5 Shield
    const md5_hash = crypto
      .createHash("md5")
      .update(raw_title + raw_company)
      .digest("hex");

    // 2. Check for existing record (Idempotency Shield)
    const existing = await step.run("check-idempotency", async () => {
      const records = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.md5_hash, md5_hash));
      return records.length > 0 ? records[0] : null;
    });

    if (existing) {
      return { status: "dropped", reason: "duplicate_md5", md5_hash };
    }

    // 3. Insert new job into Vault
    const result = await step.run("insert-to-vault", async () => {
      await db.insert(opportunities).values({
        id: uuidv4(),
        md5_hash,
        title: raw_title,
        company: raw_company,
        url: raw_url,
        description: raw_html, 
        niche: "VA_SUPPORT",
        type: "agency",
        sourcePlatform: "Harvested",
        scrapedAt: new Date(),
        isActive: true,
        tier: 3,
        relevanceScore: 0,
        latestActivityMs: Date.now(),
        metadata: JSON.stringify({ source: "event-bus", raw_title, raw_company }),
      });

      return { status: "inserted", md5_hash };
    });

    return result;
  }
);
