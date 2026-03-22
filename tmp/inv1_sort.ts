import { createClient } from "@libsql/client/http";
const url = "https://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA";
const c = createClient({ url, authToken });

try {
  // ── Measure 1A: ON CONFLICT refresh pollution ─────────────
  const r1a = await c.execute(`
    SELECT COUNT(*) AS n FROM opportunities
    WHERE scraped_at > unixepoch('now', '-15 minutes')
    AND   created_at < unixepoch('now', '-24 hours')
  `);
  const polluted = Number((r1a.rows[0] as any).n);

  // ── Measure 1B: Mixed epoch units ────────────────────────
  const r1b = await c.execute(`
    SELECT
      COUNT(CASE WHEN scraped_at > 9999999999 THEN 1 END) AS scraped_ms,
      COUNT(CASE WHEN posted_at  > 9999999999 THEN 1 END) AS posted_ms
    FROM opportunities WHERE scraped_at IS NOT NULL
  `);
  const scrapedMs = Number((r1b.rows[0] as any).scraped_ms);
  const postedMs  = Number((r1b.rows[0] as any).posted_ms);

  // ── Measure 1D: Schema column name ───────────────────────
  const r1d = await c.execute("PRAGMA table_info(opportunities)");
  const cols = r1d.rows.map((r: any) => r.name as string);
  const hasScrapedAt = cols.includes("scraped_at");
  const hasPostedAt  = cols.includes("posted_at");
  const hasCreatedAt = cols.includes("created_at");

  // ── Measure 1C: Freshness inversion proof ─────────────────
  const byScraped = await c.execute(`
    SELECT title, tier, datetime(scraped_at,'unixepoch') AS ts
    FROM opportunities WHERE is_active=1 AND tier!=4
    ORDER BY tier ASC, scraped_at DESC LIMIT 1
  `);
  const byCreated = await c.execute(`
    SELECT title, tier, datetime(created_at,'unixepoch') AS ts
    FROM opportunities WHERE is_active=1 AND tier!=4
    ORDER BY tier ASC, created_at DESC LIMIT 1
  `);
  const topScraped = (byScraped.rows[0] as any);
  const topCreated = (byCreated.rows[0] as any);
  const inverted = topScraped?.title !== topCreated?.title;

  // ── Summary ───────────────────────────────────────────────
  console.log("\n=== INVESTIGATION 1 DIAGNOSTIC ===");
  console.log(`Refresh pollution (1A): ${polluted} old records with fresh scraped_at`);
  console.log(`Mixed epochs (1B):      scraped_at_ms=${scrapedMs}  posted_at_ms=${postedMs}`);
  console.log(`Schema columns (1D):    scraped_at=${hasScrapedAt}  posted_at=${hasPostedAt}  created_at=${hasCreatedAt}`);
  console.log(`Sort inversion (check): ${inverted ? "CONFIRMED" : "not detected"}`);

  console.log("\n=== VERDICT ===");
  if (!inverted && polluted < 5 && scrapedMs === 0) {
    console.log("SORT_OK — No sort problem detected. Skip to Investigation 2.");
  } else {
    if (scrapedMs > 0 || postedMs > 0) {
      console.log("ROOT_CAUSE: 1B — MIXED_EPOCH_BUG");
    } else if (polluted > 10) {
      console.log("ROOT_CAUSE: 1A — ON_CONFLICT_REFRESH_POLLUTION");
    } else if (!hasCreatedAt) {
      console.log("ROOT_CAUSE: 1D — created_at COLUMN MISSING");
    } else if (inverted) {
      console.log("ROOT_CAUSE: 1C — JS_RESORT_OVERRIDE");
    }
    console.log("\nTop by scraped_at: " + topScraped?.title?.substring(0,50));
    console.log("Top by created_at: " + topCreated?.title?.substring(0,50));
  }
} catch (e: any) {
  console.error("DIAGNOSTIC_ERROR:", e.message);
} finally { c.close(); }
