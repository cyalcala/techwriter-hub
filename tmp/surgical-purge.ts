import { createClient } from '@libsql/client/web';

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

async function surgicalPurge() {
  console.log('🔪 SURGICAL PURGE: Starting...');

  // 1. DELETE killed-company data (Canonical, GitLab, GE Healthcare, Nextiva)
  const r1 = await c.execute(
    `DELETE FROM opportunities WHERE LOWER(company) IN ('canonical','gitlab','ge healthcare','nextiva')`
  );
  console.log(`✅ Purged ${r1.rowsAffected} killed-company rows (Canonical/GitLab/etc)`);

  // 2. Deactivate extremely stale data (>48h since last scrape)
  const cutoff48h = Date.now() - (48 * 60 * 60 * 1000);
  const r2 = await c.execute({
    sql: `UPDATE opportunities SET is_active = 0 WHERE scraped_at < ? AND is_active = 1`,
    args: [cutoff48h]
  });
  console.log(`✅ Deactivated ${r2.rowsAffected} stale rows (>48h since last scrape)`);

  // 3. Delete TRASH tier rows that somehow survived
  const r3 = await c.execute(`DELETE FROM opportunities WHERE tier = 4`);
  console.log(`✅ Purged ${r3.rowsAffected} TRASH-tier rows`);

  // 4. Update system_health timestamps to reflect current state
  const now = Date.now();
  const r4 = await c.execute({
    sql: `UPDATE system_health SET updated_at = ?`,
    args: [now]
  });
  console.log(`✅ Reset ${r4.rowsAffected} system_health timestamps`);

  // 5. Final count
  const final = await c.execute('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active=1 THEN 1 END) as active FROM opportunities');
  console.log(`\n📊 POST-PURGE: ${JSON.stringify(final.rows[0])}`);

  // 6. Show what the feed will now display  
  const top = await c.execute('SELECT title, company, tier, source_platform FROM opportunities WHERE tier != 4 AND is_active = 1 ORDER BY latest_activity_ms DESC LIMIT 10');
  console.log('\n🎯 NEW TOP 10 FEED:');
  for (const r of top.rows) {
    console.log(`  T${r.tier} | ${r.company} | ${r.title} (${r.source_platform})`);
  }
}

surgicalPurge().catch(e => console.error('PURGE FAILED:', e));
