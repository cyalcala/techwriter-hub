export async function scrapeLiveState(url = 'https://va-freelance-hub-web.vercel.app/') {
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) return null;
  
  const html = await r.text();
  
  // Extract Titles (from MirrorStage h3 and SignalCard span)
  const mirrorTitles = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(m => m[1].trim().replace(/\s+/g, ' '));
  const cardTitles = [...html.matchAll(/group-hover\/item:text-blue-600[^>]*>([\s\S]*?)<\/span>/g)].map(m => m[1].trim().replace(/\s+/g, ' '));
  const titles = [...new Set([...mirrorTitles, ...cardTitles])];

  const companies = [...html.matchAll(/tracking-widest truncate\">([^<]+)<\/span>/g)].map(m => m[1].trim());
  const ages = [...html.matchAll(/data-age=\"([0-9.]+)\"/g)].map(m => m[1]);
  
  // Extract SRE Pulse if present
  const pulseMatch = html.match(/<!-- SRE_PULSE: (\d+) -->/);
  const pulse = pulseMatch ? parseInt(pulseMatch[1]) : null;

  return {
    titles,
    companies,
    ages,
    count: titles.length,
    pulse,
    timestamp: Date.now()
  };
}

// Support CLI execution
if (process.argv[1]?.endsWith('live-frontend-check.ts')) {
  scrapeLiveState().then(state => {
    if (!state) { console.error("Failed to scrape."); process.exit(1); }
    console.log(`=== LIVE UI STATE (${state.count} items) ===`);
    state.titles.slice(0, 10).forEach((t, i) => {
      console.log(`[${state.ages[i]}h] ${t} @ ${state.companies[i]}`);
    });
    if (state.pulse) console.log(`\nSRE Pulse detected: ${new Date(state.pulse).toISOString()}`);
  });
}
