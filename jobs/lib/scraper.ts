import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
}

export const rssSources: Source[] = [
  { id: "we-work-remotely", name: "We Work Remotely", url: "https://weworkremotely.com/categories/remote-jobs.rss", platform: "WeWorkRemotely", defaultJobType: "full-time", tags: ["remote", "tech"] },
  { id: "remotive", name: "Remotive", url: "https://remotive.com/remote-jobs/feed/all", platform: "Remotive", defaultJobType: "full-time", tags: ["remote"] },
  { id: "problogger", name: "ProBlogger", url: "https://problogger.com/jobs/feed/", platform: "ProBlogger", defaultJobType: "freelance", tags: ["writing", "content"] },
  { id: "remote-co", name: "Remote.co", url: "https://remote.co/remote-jobs/feed/", platform: "RemoteCo", defaultJobType: "full-time", tags: ["remote", "VA"] },
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function stripHtml(s: string) {
  return s?.replace(/<[^>]*>/g, "").trim() ?? "";
}

export async function fetchRSSFeed(source: Source): Promise<NewOpportunity[]> {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "va-freelance-hub/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    const rawItems = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .filter((item: any) => item.title && (item.link ?? item.id))
      .map((item: any) => {
        const title = stripHtml(typeof item.title === "string" ? item.title : item.title?.["#text"] ?? "");
        const link = typeof item.link === "string" ? item.link : (item.link?.["@_href"] ?? item.id ?? "");
        return {
          title,
          company: stripHtml(item["dc:creator"] ?? item.author) || null,
          type: source.defaultJobType,
          sourceUrl: link.trim(),
          sourcePlatform: source.platform,
          tags: source.tags,
          locationType: "remote" as const,
          payRange: null,
          description: stripHtml(item.description ?? "").slice(0, 500) || null,
          postedAt: item.pubDate ?? item.published ?? null,
          isActive: true,
          contentHash: toHash(title, link.trim()),
        } satisfies NewOpportunity;
      });
  } catch {
    return [];
  }
}
