/**
 * V12 SIFTER: Cloudflare "Dumb" Harvester
 * 
 * Role: 
 * 1. Receive a URL via Cron or HTTP.
 * 2. Scrape the raw HTML payload.
 * 3. POST it to Supabase 'raw_job_harvests' table.
 */

export default {
  async fetch(request, env) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;

    // 1. Get Target URL
    const { url, platform } = await request.json();
    if (!url) return new Response("Missing URL", { status: 400 });

    try {
      // 2. The Ghost Scrape (Using Cloudflare's Edge Fetch)
      console.log(`[HARVESTER] Scaping: ${url}`);
      const scrapeResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        }
      });

      if (!scrapeResponse.ok) throw new Error(`HTTP ${scrapeResponse.status}`);
      const rawHtml = await scrapeResponse.text();

      // 3. The Pantry Dump (REST API via Supabase)
      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_job_harvests`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          source_url: url,
          raw_payload: rawHtml,
          source_platform: platform || "Cloudflare Swarm",
          status: "RAW"
        })
      });

      if (!supabaseRes.ok) {
        const err = await supabaseRes.text();
        throw new Error(`Supabase Error: ${err}`);
      }

      return new Response(JSON.stringify({ status: "dumped" }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error(`[HARVESTER_FAIL] ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
