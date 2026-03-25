import { HarvestProvider, RawAgency } from './types';

export class RedditProvider implements HarvestProvider {
  name = 'reddit';

  async fetch(): Promise<RawAgency[]> {
    const subreddits = ['philippines', 'va_ph', 'remoteworkph', 'forhire', 'remotejobs', 'VirtualAssistant', 'WorkOnline'];
    const queries = ['[Hiring] VA', 'Hiring virtual assistant', 'remote hiring philippines'];
    const results: RawAgency[] = [];

    for (const sub of subreddits) {
      // Pick a random query each cycle
      const query = queries[Math.floor(Math.random() * queries.length)];
      
      try {
        const response = await fetch(
          `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=25`,
          { headers: { 'User-Agent': 'VAIndexHarvester/1.0' } }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const posts = data.data?.children || [];

        for (const post of posts) {
          const { title, selftext, url, author } = post.data;
          const t = title.toLowerCase();
          
          // 1. MUST represent a job-hiring intent
          const isHiring = t.includes('[hiring]') || t.includes('hiring') || t.includes('seeking') || t.includes('looking for');
          if (!isHiring) continue;

          // 2. EXCLUDE [For Hire] and Discussions
          if (t.includes('[for hire]') || t.includes('forhire') || t.includes('discussion') || t.includes('question')) continue;

          // 3. ATTEMPT extraction of agency/company name
          const agencyName = this.extractAgencyName(title) || this.extractAgencyName(selftext) || author || 'Reddit Opportunity';
          
          results.push({
            name: agencyName.replace(/\[Hiring\]/gi, '').trim(),
            hiringUrl: url.startsWith('http') ? url : `https://reddit.com${url}`,
            description: `${title}\n\n${selftext?.slice(0, 500)}`,
            source: 'reddit',
            rawMetadata: post.data,
          });
        }
      } catch (e) {
        console.error(`Reddit fetch failed for r/${sub}:`, e);
      }
    }

    return results;
  }

  private extractAgencyName(text: string): string | null {
    if (!text) return null;
    
    // Pattern 1: [Hiring] Company Name
    const hiringMatch = text.match(/\[Hiring\]\s*(?:at\s+)?([A-Z][\w\s]{2,30})/i);
    if (hiringMatch) return hiringMatch[1].trim();

    // Pattern 2: (Agency|Company|Firm):\s*Name
    const companyMatch = text.match(/(?:agency|company|firm):\s*([A-Z][\w\s]{2,20})/i);
    if (companyMatch) return companyMatch[1].trim();
    
    return null;
  }
}
