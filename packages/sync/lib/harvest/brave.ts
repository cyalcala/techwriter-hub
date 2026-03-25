import { HarvestProvider, RawAgency } from './types';

export class BraveProvider implements HarvestProvider {
  name = 'brave';

  async fetch(): Promise<RawAgency[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      console.warn('BRAVE_SEARCH_API_KEY is not set. Skipping Brave fetch.');
      return [];
    }

    const niches = ["Virtual Assistant", "Executive Assistant", "Customer Support", "Social Media Manager", "Bookkeeper", "Data Entry"];
    const locations = ["Philippines", "Filipino", "Remote PH"];
    const platforms = ["site:greenhouse.io", "site:lever.co", "site:workable.com", "hiring"];

    // Widening the Net: Run 3 batch queries to maximize breadth
    const queries = [];
    for (let i = 0; i < 3; i++) {
        const niche = niches[Math.floor(Math.random() * niches.length)];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        queries.push(`"${niche}" ${loc} ${platform}`);
    }

    const results: RawAgency[] = [];

    for (const query of Array.from(new Set(queries))) {
        console.log(`[Brave] Harvesting with query: ${query}`);
        try {
            const response = await fetch(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`,
              { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } }
            );

            if (!response.ok) continue;

            const data = await response.json();
            const webResults = data.web?.results || [];

            for (const res of webResults) {
                results.push({
                    name: res.title.replace(/\|.*$/, '').replace(/ - .*$/, '').trim(),
                    hiringUrl: res.url,
                    description: res.description,
                    source: 'brave',
                    rawMetadata: res,
                });
            }
        } catch (e) {
            console.error(`Brave fetch failed for query "${query}":`, e);
        }
    }

    return results;
  }
}
