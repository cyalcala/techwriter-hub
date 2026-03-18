import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
}

export const rssSources: Source[] = [
  {
    id: "onlinejobs-blog",
    name: "OnlineJobs.ph Insiders",
    url: "https://www.onlinejobs.ph/blog/feed/",
    platform: "OnlineJobs",
    defaultJobType: "VA",
    tags: ["philippines", "tips", "hiring"],
  },
  {
    id: "himalayas",
    name: "Himalayas",
    url: "https://himalayas.app/jobs/rss",
    platform: "Himalayas",
    defaultJobType: "full-time",
    tags: ["remote", "global"],
  },
  {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss", // FIXED URL
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "global"],
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/feed", // FIXED URL
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote", "tech"],
  },
  {
    id: "remote-co",
    name: "Remote.co",
    url: "https://remote.co/remote-jobs/feed/",
    platform: "RemoteCo",
    defaultJobType: "full-time",
    tags: ["remote", "admin", "VA"],
  },
  {
    id: "remote-ok",
    name: "Remote OK",
    url: "https://remoteok.com/remote-jobs.rss",
    platform: "RemoteOK",
    defaultJobType: "full-time",
    tags: ["remote", "high-pay"],
  },
  {
    id: "problogger",
    name: "ProBlogger",
    url: "https://problogger.com/jobs/feed/",
    platform: "ProBlogger",
    defaultJobType: "freelance",
    tags: ["writing", "creative"],
  },
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function stripHtml(s: string | undefined) {
  return s?.replace(/<[^>]*>/g, "").trim() ?? "";
}

export async function fetchRSSFeed(source: Source): Promise<NewOpportunity[]> {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.log(`[rss] ${source.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    const rawItems = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .filter((item: any) => item.title && (item.link ?? item.id))
      .map((item: any) => {
        const title = stripHtml(
          typeof item.title === "string" ? item.title : item.title?.["#text"] ?? ""
        );
        const link =
          typeof item.link === "string"
            ? item.link
            : (item.link?.["@_href"] ?? item.id ?? "");
        const sourceUrl = link.trim();
        if (!title || !sourceUrl) return null;
        
        // Drizzle accepts crypto.randomUUID() for text fields safely now that DB schema is mapped correctly
        return {
          id: crypto.randomUUID(), 
          title,
          company: stripHtml(item["dc:creator"] ?? item.author) || null,
          type: source.defaultJobType,
          sourceUrl,
          sourcePlatform: source.platform,
          tags: source.tags,
          locationType: "remote" as const,
          payRange: null,
          description: stripHtml(item.description ?? "").slice(0, 500) || null,
          postedAt: item.pubDate ? new Date(item.pubDate) : null,
          scrapedAt: new Date(),
          isActive: true,
          contentHash: toHash(title, sourceUrl),
        } as unknown as NewOpportunity;

      })
      .filter(Boolean) as NewOpportunity[];
  } catch (err) {
    console.log(`[rss] ${source.name} failed:`, (err as Error).message);
    return [];
  }
}
