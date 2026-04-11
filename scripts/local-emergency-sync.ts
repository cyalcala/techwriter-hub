import { createClient } from "@libsql/client/http";
import crypto from "node:crypto";
import 'dotenv/config';

/**
 * VA.INDEX Sovereign Emergency Harvester
 * 
 * ROLE:
 * Last-resort ingestion path. Bypasses Trigger.dev/Inngest.
 * Directly scrapes a "Gold" source and plates into Turso.
 */

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    console.error("❌ Database credentials missing.");
    process.exit(1);
  }

  const client = createClient({ url, authToken: token });

  console.log("🚀 [SOVEREIGN-SYNC] Initiating manual emergency harvest...");

  try {
    // 1. Target Alpha Source (WWR Senior Dev)
    const TARGET = "https://weworkremotely.com/remote-jobs/top-tal-inc-senior-front-end-developer";
    console.log(`🔗 Scrapping Alpha Source: ${TARGET}`);
    
    const res = await fetch(TARGET);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // 2. Minimal Extraction (Surgical)
    // In a real scenario, we'd use a more robust parser, 
    // but for emergency sync, we just need to prove data flow.
    const titleMatch = html.match(/<h1>([^<]+)<\/h1>/);
    const companyMatch = html.match(/<h2><a href="[^"]+">([^<]+)<\/a><\/h2>/);
    const title = titleMatch ? titleMatch[1].trim() : "Senior Web Developer (Sovereign Signal)";
    const company = companyMatch ? companyMatch[1].trim() : "WWR Alpha";

    const md5_hash = crypto
      .createHash("md5")
      .update((title + company).toLowerCase().trim())
      .digest("hex");

    const now = Date.now();
    const goldData = {
      id: crypto.randomUUID(),
      md5_hash,
      title,
      company,
      url: TARGET,
      description: "Emergency Sovereign Signal injected during Trigger.dev outage.",
      niche: "Development",
      type: "agency",
      source_platform: "Sovereign Emergency",
      scraped_at: now,
      is_active: 1,
      tier: 2, // Bronze+ priority
      relevance_score: 85,
      latest_activity_ms: now,
      created_at: Math.floor(now / 1000),
      region: "Philippines"
    };

    // 3. Plate into Turso
    console.log(`🍽️ Plating Sovereign Signal: ${title} @ ${company}`);
    await client.execute({
      sql: `INSERT INTO opportunities (
        id, md5_hash, title, company, url, description, niche, type, 
        source_platform, scraped_at, is_active, tier, relevance_score, 
        latest_activity_ms, created_at, region
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(md5_hash) DO UPDATE SET 
        scraped_at = excluded.scraped_at,
        latest_activity_ms = excluded.latest_activity_ms,
        is_active = 1`,
      args: Object.values(goldData)
    });

    console.log("✅ Sovereign Sync successful. Signal pushed to Turso.");

  } catch (err: any) {
    console.error("❌ Sovereign Sync failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

run();
