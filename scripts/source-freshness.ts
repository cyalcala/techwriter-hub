const sources = [
  "https://www.reddit.com/r/VirtualAssistant/new.json?limit=3",
  "https://www.reddit.com/r/forhire/new.json?limit=3",
  "https://remoteok.com/api",
  "https://jobicy.com/api/v2/remote-jobs?count=3"
];

async function check() {
  console.log("=== RATHOLE: SOURCE CACHE TRAP ===");
  for (const url of sources) {
    const bustUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    console.log(`\nChecking: ${new URL(url).hostname}`);
    try {
      const res = await fetch(bustUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; VA.INDEX/1.0; staleness-audit)" },
        signal: AbortSignal.timeout(10000)
      });
      console.log(`  HTTP: ${res.status}`);
      const headers = [...res.headers.entries()].filter(([k]) => 
        k.toLowerCase().includes('cache') || k.toLowerCase().includes('age') || k.toLowerCase().includes('cdn')
      );
      if (headers.length > 0) {
        console.log("  Cache headers found:");
        headers.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
      }
      if (res.ok) {
        const text = await res.text();
        console.log(`  ✅ LIVE — returned ~${text.length} bytes`);
      } else if (res.status === 429) {
        console.log("  ⚠️ RATE LIMITED");
      } else if (res.status === 403) {
        console.log("  🚨 BLOCKED");
      } else {
        console.log(`  ❌ DEAD — HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.log(`  ❌ FAIL — ${e.message}`);
    }
  }
}

check();
