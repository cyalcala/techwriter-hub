import { createClient } from '@libsql/client/web';

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

async function run() {
  // 1. Count killed-company data still in DB
  const killed = await c.execute(
    `SELECT company, COUNT(*) as cnt FROM opportunities WHERE LOWER(company) IN ('canonical','gitlab','ge healthcare','nextiva') GROUP BY company`
  );
  console.log('=== KILLED COMPANIES STILL IN DB ===');
  for (const r of killed.rows) console.log(JSON.stringify(r));

  // 2. Count by tier
  const tiers = await c.execute('SELECT tier, COUNT(*) as cnt FROM opportunities GROUP BY tier ORDER BY tier');
  console.log('\n=== TIER DISTRIBUTION ===');
  for (const r of tiers.rows) console.log(JSON.stringify(r));

  // 3. Check what the frontend sees (top 10 by latestActivityMs, tier != 4)
  const frontendView = await c.execute(
    'SELECT title, company, tier, latest_activity_ms, source_platform FROM opportunities WHERE tier != 4 ORDER BY latest_activity_ms DESC LIMIT 10'
  );
  console.log('\n=== FRONTEND TOP 10 (what users see) ===');
  for (const r of frontendView.rows) {
    const age = (Date.now() - Number(r.latest_activity_ms)) / (1000 * 60 * 60);
    console.log(`[${age.toFixed(1)}h ago] T${r.tier} | ${r.company} | ${r.title} (${r.source_platform})`);
  }

  // 4. Check total active vs inactive
  const counts = await c.execute('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active=1 THEN 1 END) as active, COUNT(CASE WHEN is_active=0 OR is_active IS NULL THEN 1 END) as inactive FROM opportunities');
  console.log('\n=== ACTIVE vs INACTIVE ===');
  console.log(JSON.stringify(counts.rows[0]));
}

run().catch(e => console.error(e));
