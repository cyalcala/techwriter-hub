/**
 * V12 REINFORCED: Cloudflare "Mega-Hunter"
 * 
 * Capability: 700 - 2,700 jobs / day.
 * Safety: Host-level cooldown (15s) and Atomic Locking.
 */

export default {
  async fetch(request, env) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INNGEST_EVENT_KEY } = env;
    const MAX_BATCH = Math.max(1, Math.min(10, Number(env.MAX_BATCH || 5)));
    const HOST_COOLDOWN_MS = Math.max(1000, Number(env.HOST_COOLDOWN_MS || 15000));
    const REQUEST_JITTER_MS = Math.max(0, Number(env.REQUEST_JITTER_MS || 1200));

    try {
      // 1) Fetch candidate ghost leads first.
      const listRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests?select=id,source_url,source_platform,updated_at&status=eq.RAW&raw_payload=eq.%7C%7CV12_GHOST_LEAD%7C%7C&locked_by=is.null&order=updated_at.asc&limit=${MAX_BATCH * 3}`, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      });
      if (!listRes.ok) throw new Error("Ghost list query failed");
      const candidates = await listRes.json();
      if (!candidates?.length) {
        return new Response(JSON.stringify({ status: "idle", reason: "queue_empty" }), { status: 200 });
      }

      const seenHosts = new Set();
      const selected = [];
      for (const row of candidates) {
        try {
          const host = new URL(row.source_url).host;
          if (seenHosts.has(host)) continue;
          seenHosts.add(host);
          selected.push({ ...row, host });
        } catch {
          continue;
        }
        if (selected.length >= MAX_BATCH) break;
      }
      if (!selected.length) {
        return new Response(JSON.stringify({ status: "idle", reason: "no_valid_urls" }), { status: 200 });
      }

      let captured = 0;
      let failed = 0;

      // 2) Process a bounded batch with per-host spread and jitter.
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) Firefox/125.0"
      ];
      for (const job of selected) {
        const claimRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests?id=eq.${job.id}&locked_by=is.null&status=eq.RAW`, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            status: "PROCESSING",
            locked_by: "CLOUD-HUNTER-V12",
            updated_at: new Date().toISOString(),
          }),
        });
        if (!claimRes.ok) continue;
        const claimed = await claimRes.json();
        if (!claimed?.length) continue;

        console.log(`[HUNTER] Hunting Lead: ${job.source_url} (${job.host})`);
        try {
          const scrapeResponse = await fetch(job.source_url, {
            headers: { "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)] }
          });
          if (!scrapeResponse.ok) {
            await this.updateStatus(job.id, "FAILED", SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            failed++;
            continue;
          }

          const rawHtml = await scrapeResponse.text();
          await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests?id=eq.${job.id}`, {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              raw_payload: rawHtml,
              status: "RAW",
              locked_by: null,
              updated_at: new Date().toISOString()
            })
          });

          if (INNGEST_EVENT_KEY) {
            await fetch(`https://innge.st/e/${INNGEST_EVENT_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "job.harvested",
                data: {
                  raw_title: "Cloud Scraped Job",
                  raw_company: "Cloud Scraped Co",
                  raw_url: job.source_url,
                  raw_html: rawHtml.slice(0, 15000)
                }
              })
            });
          }
          captured++;
        } catch (err) {
          await this.updateStatus(job.id, "FAILED", SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          failed++;
        }

        await new Promise((resolve) => setTimeout(resolve, HOST_COOLDOWN_MS + Math.floor(Math.random() * REQUEST_JITTER_MS)));
      }

      return new Response(JSON.stringify({ status: "complete", captured, failed, selected: selected.length }));

    } catch (error) {
      console.error(`[HUNTER_FAIL] ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },

  async updateStatus(id, status, url, key) {
    await fetch(`${url}/rest/v1/raw_job_harvests?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        locked_by: null,
        error_log: status === "FAILED" ? "Cloudflare hunter scrape failed" : null,
        updated_at: new Date().toISOString()
      })
    });
  }
};
