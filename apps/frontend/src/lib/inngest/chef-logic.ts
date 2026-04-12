import { createHash } from "crypto";
import { siftOpportunity, OpportunityTier } from "../../../../../src/core/sieve";

const GHOST_SENTINEL = "||V12_GHOST_LEAD||";
const EDGE_PROXY_URL = process.env.EDGE_PROXY_URL || "https://va-edge-proxy.cyrusalcala-agency.workers.dev";
const EDGE_PROXY_SECRET = process.env.VA_PROXY_SECRET;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * PREP: Ghost Hydration Logic
 */
export async function getCookablePayload(job: { raw_payload?: string; source_url?: string | null }): Promise<string> {
  if (job.raw_payload && job.raw_payload !== GHOST_SENTINEL && job.raw_payload.length >= 120) {
    return job.raw_payload;
  }
  if (!job.source_url) throw new Error("Missing source_url for ghost hydration");

  const proxiedUrl = new URL(EDGE_PROXY_URL);
  proxiedUrl.searchParams.set("url", job.source_url);
  const useEdgeProxy = Boolean(EDGE_PROXY_URL && EDGE_PROXY_SECRET);

  let html: string;
  try {
    const res = await fetch(useEdgeProxy ? proxiedUrl.toString() : job.source_url, {
      signal: AbortSignal.timeout(15000),
      headers: useEdgeProxy
        ? { "X-VA-Proxy-Secret": EDGE_PROXY_SECRET as string, "user-agent": "VAHubExecutiveChef/1.0 (+ingest-hydration)" }
        : { "user-agent": "VAHubExecutiveChef/1.0 (+ingest-hydration)" },
    });
    if (!res.ok) throw new Error(`Primary hydration failed with status ${res.status}`);
    html = await res.text();
  } catch (err: any) {
    if (!useEdgeProxy) throw err; // Already tried direct or proxy not configured

    console.warn(`⚠️ [CHEF] Primary hydration vector failed: ${err.message}. Attempting direct fallback...`);
    const directRes = await fetch(job.source_url, {
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": "VAHubExecutiveChef/1.0 (Direct Fallback)" }
    });
    if (!directRes.ok) throw new Error(`Hydration vector exhaustive failure: ${directRes.status}`);
    html = await directRes.text();
  }

  const text = htmlToText(html);
  if (!text || text.length < 120) throw new Error("Hydration yielded insufficient content");
  return text.slice(0, 20000);
}

/**
 * STRATEGIZE: The Freshness Shield (MD5 Hash)
 */
export function generateMd5Hash(title: string, company: string): string {
  return createHash("md5")
    .update((title + company).toLowerCase().trim())
    .digest("hex");
}

/**
 * COOK: AI Extraction & Sieve Alignment
 */
export async function cookAndStrategize(rawHtml: string, metadata: any) {
  const { AIMesh } = await import("../../../../../packages/ai/ai-mesh");
  
  // 1. High-Precision AI Extraction
  const extraction = await AIMesh.extract(rawHtml);
  
  // 2. Strategize Niche & Tier (Aligning with Sieve)
  const heuristic = siftOpportunity(
    extraction.title,
    extraction.description,
    extraction.company || "Generic",
    metadata.source || "V12 Executive Chef"
  );
  
  return {
    ...extraction,
    niche: heuristic.domain,
    tier: heuristic.tier,
    relevanceScore: Math.max(extraction.relevanceScore ?? 0, heuristic.relevanceScore),
    isPhCompatible: heuristic.isPhCompatible,
    metadata: {
      ...(extraction.metadata || {}),
      sieveTier: heuristic.tier,
      sieveDomain: heuristic.domain,
      trace_region: metadata.region
    }
  };
}
