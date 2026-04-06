import { AIExtractionSchema, type AIExtraction } from "../../../../../packages/db/validation";
import * as cheerio from "cheerio";

/**
 * Priority 3.1: Token Guard (HTML Sanitization)
 * Aggressively strips non-essential tags to preserve AI context windows and token quotas.
 */
export function stripJunk(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove non-content elements
  $(
    "script, style, head, nav, footer, header, iframe, noscript, svg, path, img, button, form, aside, link, .ads, #ads"
  ).remove();

  // Get text while preserving structure
  let cleaned = $("body").html() || $.html();

  // Whitespace normalization
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return cleaned;
}

/**
 * Priority 4: The Agentic Sifter (V12)
 * 5-Tier Failover: Cerebras -> Groq -> OpenRouter -> Cloudflare AI -> Gemini
 */

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
YOU ARE THE V12 INTELLIGENCE ENGINE (THE AGENTIC SIFTER).
Your mission is to EXTRACT structured data and SIFT for quality in a single pass.

### EXTRACTION RULES:
- Niche MUST be: TECH_ENGINEERING, MARKETING, SALES_GROWTH, VA_SUPPORT, ADMIN_BACKOFFICE, CREATIVE_MULTIMEDIA, or BPO_SERVICES.

### SIFTING RULES (PH-FIRST TIERING):
- Tier 0 (PLATINUM): Explicitly for Filipinos (e.g., "Hiring from Philippines", "₱", "PHT").
- Tier 1 (GOLD): APAC/SEA remote or high-signal remote ($20+/hr or specific VA roles).
- Tier 2 (SILVER): Worldwide remote.
- Tier 3 (BRONZE): Generic remote.
- Tier 4 (TRASH): Geographic mismatch (US-only, UK-only) or non-job content.

### JSON OUTPUT:
{
  "title": string,
  "company": string,
  "salary": string | null,
  "description": string (detailed summary),
  "niche": "CATEGORY",
  "type": "agency" | "direct",
  "locationType": "remote" | "hybrid" | "onsite",
  "tier": 0 | 1 | 2 | 3 | 4,
  "isPhCompatible": boolean,
  "relevanceScore": number (0-100)
}
`;

function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function callCerebras(html: string): Promise<any> {
  if (!CEREBRAS_API_KEY) return null;
  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `HTML:\n${html.slice(0, 5000)}` }],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return extractJson(data.choices[0].message.content);
  } catch { return null; }
}

async function callGroq(html: string): Promise<any> {
  if (!GROQ_API_KEY) return null;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `HTML:\n${html.slice(0, 5000)}` }],
        temperature: 0
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return extractJson(data.choices[0].message.content);
  } catch { return null; }
}

async function callOpenRouter(html: string): Promise<any> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it:free",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `HTML:\n${html.slice(0, 5000)}` }],
        temperature: 0
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return extractJson(data.choices[0].message.content);
  } catch { return null; }
}

async function callCloudflareAI(html: string): Promise<any> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) return null;
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `HTML:\n${html.slice(0, 5000)}` }]
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return extractJson(data.result.response);
  } catch { return null; }
}

async function callGemini(html: string): Promise<any> {
  if (!GEMINI_API_KEY) return null;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nHTML:\n${html.slice(0, 10000)}` }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return extractJson(data.candidates[0].content.parts[0].text);
  } catch { return null; }
}

/**
 * The V12 Waterfall Orchestrator (One-Pass Intelligence)
 */
export async function runAIWaterfall(html: string): Promise<AIExtraction> {
  const beforeCount = html.length;
  const cleanedHtml = stripJunk(html);
  const afterCount = cleanedHtml.length;
  const reduction = Math.round(((beforeCount - afterCount) / beforeCount) * 100);

  console.log(`[Token Guard] Before: ${beforeCount} | After: ${afterCount} | Reduction: ${reduction}%`);

  const models = [
    { name: "cerebras-llama-3.1-8b", fn: callCerebras },
    { name: "groq-llama-3.1-70b", fn: callGroq },
    { name: "openrouter-gemma-2-free", fn: callOpenRouter },
    { name: "cloudflare-llama-3.1-8b", fn: callCloudflareAI },
    { name: "gemini-1.5-flash", fn: callGemini }
  ];

  for (const model of models) {
    console.log(`[Waterfall] Attempting ${model.name}...`);
    const result = await model.fn(cleanedHtml);
    const validated = AIExtractionSchema.safeParse(result);
    
    if (validated.success) {
      console.log(`[Waterfall] SUCCESS using ${model.name}`);
      return { 
        ...validated.data, 
        metadata: { 
          model: model.name, 
          tokenReduction: `${reduction}%`,
          v12: true
        } 
      };
    }
    console.warn(`[Waterfall] ${model.name} Failed/Invalid. Proceeding to next model...`);
  }

  throw new Error("[Waterfall] V12 CRITICAL FAILURE: All 5 AI models failed validation/extraction.");
}
