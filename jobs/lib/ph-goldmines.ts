import * as cheerio from "cheerio";
import { mapTitleToDomain } from "../../packages/db/taxonomy";
import { proxyFetch } from "./proxy-fetch";
import { HarvestSignal } from "../../packages/db/v12-types";
import crypto from "crypto";

export const goldmineSources = [
  {
    name: "Athena",
    url: "https://www.athena.go/careers",
    type: "agency"
  },
  {
    name: "CloudStaff",
    url: "https://www.cloudstaff.com/jobs/",
    type: "agency"
  },
  {
    name: "Outsource Access",
    url: "https://outsourceaccess.com/careers/",
    type: "agency"
  },
  {
    name: "Cyberbacker",
    url: "https://cyberbacker.ph/careers/",
    type: "agency"
  },
  {
    name: "Virtudesk",
    url: "https://www.virtudesk.com/careers/",
    type: "agency"
  },
  {
    name: "BruntWork",
    url: "https://bruntwork.co/careers/",
    type: "agency"
  },
  {
    name: "GoTeam",
    url: "https://go.team/careers/",
    type: "agency"
  },
  {
    name: "MultiplyMii",
    url: "https://jobs.multiplymii.com/",
    type: "agency"
  },
  {
    name: "Shepherd",
    url: "https://www.supportshepherd.com/jobs",
    type: "agency"
  },
  {
    name: "Reddit: buhaydigital",
    url: "https://www.reddit.com/r/buhaydigital/new.json",
    type: "social"
  },
  {
    name: "Reddit: VirtualAssistantPH",
    url: "https://www.reddit.com/r/VirtualAssistantPH/new.json",
    type: "social"
  },
  {
    name: "Reddit: RemoteWorkPH",
    url: "https://www.reddit.com/r/RemoteWorkPH/new.json",
    type: "social"
  }
];


export async function fetchGoldmineJobs(sourceName: string): Promise<HarvestSignal[]> {
  const source = goldmineSources.find(s => s.name === sourceName);
  if (!source) return [];

  console.log(`[goldmines] Scouting ${sourceName}...`);
  
  try {
    const rawSignals: any[] = [];

    // 1. RAW DATA COLLECTION
    if (source.type === 'social' && source.url.endsWith('.json')) {
        const res = await fetch(source.url, {
            headers: { "User-Agent": "VA.INDEX/1.0 (Titanium SRE; ph-goldmines)" }
        });
        const data = await res.json();
        const posts = data.data?.children || [];
        posts.map((p: any) => {
            rawSignals.push({
                title: p.data.title,
                company: `Reddit: ${p.data.author}`,
                url: `https://reddit.com${p.data.permalink}`,
                description: p.data.selftext || p.data.title
            });
        });
    } else {
        const res = await proxyFetch(source.url);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        $('a').each((_, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text.includes('<') || text.includes('{') || text.length < 10) return;

            const isJobLink = href && (
                href.includes('/job/') || 
                href.includes('/careers/') || 
                href.includes('/vacancy/') ||
                text.toLowerCase().includes('apply') ||
                text.toLowerCase().includes('virtual assistant')
            );

            if (isJobLink && href) {
                rawSignals.push({
                    title: text,
                    company: sourceName,
                    url: href.startsWith('http') ? href : new URL(href, source.url).toString(),
                    description: `Specialized opportunity from ${sourceName}. Click for details.`
                });
            }
        });
    }

    // 2. ENRICHMENT ENGINE (UNIFICATION)
    const enriched: HarvestSignal[] = rawSignals.map(signal => {
        const niche = mapTitleToDomain(signal.title, signal.description || "");
        
        // 🛡️ MD5 Idempotency Shield
        const hashBase = `${signal.title}|${signal.company}`.toLowerCase().trim();
        const md5_hash = crypto.createHash('md5').update(hashBase).digest('hex');

        // 💰 Basic Salary Detection
        let salary: string | null = null;
        const salaryMatch = signal.description.match(/(\$\d+[,.]?\d+\s*-\s*\$\d+[,.]?\d+)|(\$\d+[,.]?\d+\/hr)|(PHP\s*\d+k)/i);
        if (salaryMatch) salary = salaryMatch[0];

        return {
            md5_hash,
            title: signal.title,
            company: signal.company,
            url: signal.url,
            description: signal.description,
            niche,
            sourcePlatform: sourceName,
            region: "Philippines",
            salary,
            tier_hint: 1, // Goldmine signals are high-intent PH roles
            metadata: { enriched_at_harvest: true }
        };
    });

    return enriched.slice(0, 20);
  } catch (err: any) {
    console.error(`[goldmines] Failed ${sourceName}: ${err.message}`);
    return [];
  }
}
