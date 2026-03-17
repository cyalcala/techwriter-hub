import { join } from "path";
import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";

// Path to compiled Zig parser binary (built in packages/zig-parser)
const ZIG_PARSER_BIN = join(
  import.meta.dir,
  "../zig-parser/zig-out/bin/zig-parser"
);

interface ParsedJobItem {
  title?: string;
  company?: string;
  url?: string;
  date?: string;
  description?: string;
}

function toContentHash(title: string, sourceUrl: string): string {
  return createHash("sha256")
    .update(`${title}::${sourceUrl}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Calls the Zig binary as a subprocess.
 * Pipes raw HTML to stdin, reads newline-delimited JSON from stdout.
 * Falls back to empty array if binary doesn't exist yet (Phase 0).
 */
async function parseHtmlWithZig(html: string): Promise<ParsedJobItem[]> {
  let proc: ReturnType<typeof Bun.spawn>;

  try {
    proc = Bun.spawn([ZIG_PARSER_BIN], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    console.warn("[html] Zig parser binary not found — skipping HTML scrape. Build it in packages/zig-parser first.");
    return [];
  }

  // Write HTML to stdin and close
  const encoder = new TextEncoder();
  const writer = proc.stdin.getWriter();
  await writer.write(encoder.encode(html));
  await writer.close();

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error(`[html] Zig parser exited with ${exitCode}: ${stderr}`);
    return [];
  }

  const items: ParsedJobItem[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    try {
      items.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  return items;
}

export async function fetchHTMLSource(source: Source): Promise<NewOpportunity[]> {
  console.log(`[html] Fetching ${source.name}...`);

  let html: string;
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; va-freelance-hub/1.0; +https://github.com/cyalcala/va-freelance-hub)",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error(`[html] Failed to fetch ${source.name}:`, err);
    return [];
  }

  const parsed = await parseHtmlWithZig(html);

  const opportunities: NewOpportunity[] = parsed
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: item.title!,
      company: item.company ?? null,
      type: source.defaultJobType,
      sourceUrl: item.url!,
      sourcePlatform: source.platform,
      tags: source.tags,
      locationType: "remote" as const,
      payRange: null,
      description: item.description?.slice(0, 500) ?? null,
      postedAt: item.date ?? null,
      isActive: true,
      contentHash: toContentHash(item.title!, item.url!),
    }));

  console.log(`[html] ${source.name}: ${opportunities.length} items`);
  return opportunities;
}
