import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function check() {
  try {
    const now = new Date();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const fifteenMinsAgo = nowSeconds - 15 * 60;
    const oneHourAgo = nowSeconds - 60 * 60;

    const [total, active, last15, last1hr, newest, topListing] =
      await Promise.all([
        client.execute("SELECT COUNT(*) as c FROM opportunities"),
        client.execute(
          `SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1`
        ),
        client.execute(
          `SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > ${fifteenMinsAgo}`
        ),
        client.execute(
          `SELECT COUNT(*) as c FROM opportunities WHERE scraped_at > ${oneHourAgo}`
        ),
        client.execute(
          `SELECT scraped_at FROM opportunities ORDER BY scraped_at DESC LIMIT 1`
        ),
        client.execute(
          `SELECT title, source_platform as source, tier, scraped_at FROM opportunities WHERE is_active = 1 ORDER BY scraped_at DESC LIMIT 5`
        )
      ]);

    const newestVal = (newest.rows[0] as any)?.scraped_at;
    const newestTs = new Date(newestVal * 1000);
    const staleHrs = Math.round((now.getTime() - newestTs.getTime()) / 360000) / 10;

    console.log("TOTAL_ALL:", (total.rows[0] as any).c);
    console.log("ACTIVE_VISIBLE:", (active.rows[0] as any).c);
    console.log("WRITTEN_LAST_15MIN:", (last15.rows[0] as any).c);
    console.log("WRITTEN_LAST_1HR:", (last1hr.rows[0] as any).c);
    console.log("NEWEST_RECORD:", newestVal, `(${newestTs.toISOString()})`);
    console.log("DATA_STALE_HRS:", staleHrs);

    console.log("\nTOP_5_NEWEST_IN_DB:");
    topListing.rows.forEach((r: any) =>
      console.log({
        title: r.title?.substring(0, 50),
        source: r.source,
        tier: r.tier,
        age_mins: Math.round((now.getTime() - new Date(r.scraped_at * 1000).getTime()) / 60000)
      })
    );

    const last15Count = (last15.rows[0] as any).c;
    if (last15Count > 0) {
      console.log("\nTURSO_VERDICT: FRESH");
      console.log("New data exists in Turso.");
      console.log("Problem is between Turso and the browser.");
    } else {
      console.log("\nTURSO_VERDICT: STALE");
      console.log("No new writes in last 15min.");
      console.log("Problem is in the pipeline.");
    }
  } catch (err: any) {
    console.error("TURSO_FAIL:", err.message);
  } finally {
    client.close();
  }
}

check();
