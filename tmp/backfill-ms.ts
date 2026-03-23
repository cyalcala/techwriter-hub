import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

console.log("🛠️  Precision Backfill (Force Milliseconds)...");

async function backfill() {
  const allOpps = await client.execute("SELECT id, posted_at, scraped_at FROM opportunities");
  console.log(`Analyzing ${allOpps.rows.length} rows...`);

  let count = 0;
  for (const row of allOpps.rows) {
    const pStr = row.posted_at as string;
    const sStr = row.scraped_at as string;
    
    // Parse manually to avoid any locale/timezone weirdness
    const pMs = pStr ? new Date(pStr).getTime() : 0;
    const sMs = sStr ? new Date(sStr).getTime() : 0;
    
    let latestMs = Math.max(pMs, sMs);
    
    // Safety: If it's 10 digits (seconds), it's wrong for this system.
    // Standard Unix MS for 2026 is ~1.7e12
    if (latestMs > 0 && latestMs < 1000000000000) {
       latestMs = latestMs * 1000;
    }

    if (latestMs > 0) {
      await client.execute({
        sql: "UPDATE opportunities SET latest_activity_ms = ? WHERE id = ?",
        args: [latestMs, row.id as string]
      });
      count++;
      if (count <= 3) {
        console.log(`Sample [${row.id}]: ${latestMs}ms (${new Date(latestMs).toISOString()})`);
      }
    }
  }
  console.log(`✅ Successfully updated ${count} rows with Millisecond precision.`);
}

await backfill();
client.close();
