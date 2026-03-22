const sources = [
  "https://www.reddit.com/r/VirtualAssistant/new.json?limit=5",
  "https://www.reddit.com/r/forhire/new.json?limit=5",
  "https://remoteok.com/api",
  "https://jobicy.com/api/v2/remote-jobs?count=5",
  "https://himalayas.app/jobs/api?limit=5"
];

async function check() {
  console.log("=== SOURCE CACHE-POISONING AUDIT ===");
  for (const url of sources) {
    const label = new URL(url).hostname;
    const t = Date.now();
    try {
      const res1 = await fetch(`${url}${url.includes('?') ? '&' : '?'}t1=${t}`, {
        headers: { "User-Agent": "VA.INDEX/1.0 (freshness-audit)" }
      });
      const hash1 = await res1.text();
      
      await new Promise(r => setTimeout(r, 10000)); // 10s wait
      
      const res2 = await fetch(`${url}${url.includes('?') ? '&' : '?'}t2=${t+10}`, {
        headers: { "User-Agent": "VA.INDEX/1.0 (freshness-audit)" }
      });
      const hash2 = await res2.text();
      
      if (res1.status === 429) console.log(`RATE_LIMITED  ${label}`);
      else if (res1.status === 403) console.log(`BLOCKED       ${label}`);
      else if (hash1 === hash2) {
        console.log(`CACHE_SUSPECT ${label} ← identical response after 10s`);
      } else {
        console.log(`LIVE          ${label}`);
      }
    } catch (e: any) {
      console.log(`UNREACHABLE   ${label} (${e.message})`);
    }
  }
}

check();
