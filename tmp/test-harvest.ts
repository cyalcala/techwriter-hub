import { BraveProvider } from '../packages/sync/lib/harvest/brave';
import { RedditProvider } from '../packages/sync/lib/harvest/reddit';
import { siftOpportunity, OpportunityTier } from '../jobs/lib/sifter';

async function test() {
  console.log('--- Testing Brave Provider ---');
  const brave = new BraveProvider();
  const braveResults = await brave.fetch();
  console.log(`Brave found ${braveResults.length} results.`);

  console.log('\n--- Testing Reddit Provider ---');
  const reddit = new RedditProvider();
  const redditResults = await reddit.fetch();
  console.log(`Reddit found ${redditResults.length} raw results.`);
  
  const sifted = redditResults.map(r => ({
    ...r,
    tier: siftOpportunity(r.name + ' ' + (r.description || ''), r.description || '', r.source)
  }));

  const valid = sifted.filter(s => s.tier !== OpportunityTier.TRASH);
  console.log(`Valid Reddit Signals (non-TRASH): ${valid.length}`);
  
  valid.slice(0, 10).forEach(r => console.log(`- [Tier ${OpportunityTier[r.tier]}] ${r.name}: ${r.hiringUrl}`));
}

test().catch(console.error);
