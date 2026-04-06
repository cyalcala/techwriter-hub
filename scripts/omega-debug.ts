import { stripJunk } from "../apps/frontend/src/lib/ai/waterfall";
import { AIExtractionSchema } from "../packages/db/validation";

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

async function callGemini(html: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing");
    return null;
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nHTML:\n${html.slice(0, 10000)}` }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      })
    });
    console.log("Gemini Status:", response.status);
    if (!response.ok) {
        const err = await response.text();
        console.error("Gemini Error Body:", err);
        return null;
    }
    const data = await response.json();
    console.log("Gemini Raw Response:", JSON.stringify(data, null, 2));
    const content = data.candidates[0].content.parts[0].text;
    return extractJson(content);
  } catch (e: any) { 
    console.error("Gemini Fetch Exception:", e.message);
    return null; 
  }
}

async function main() {
  const html = `
    <h1>Senior GoHighLevel Automator & Writer</h1>
    <p>We need an expert to build complex SaaS workflows in GoHighLevel and write engaging email copy. 
    MUST be located in the Philippines (Manila preferred). 
    Rate is flexible between $15/hr to $30/hr depending on experience. 
    Start date ASAP.</p>
  `;
  const result = await callGemini(stripJunk(html));
  console.log("Extracted Result:", JSON.stringify(result, null, 2));
  
  if (result) {
    const validated = AIExtractionSchema.safeParse(result);
    if (!validated.success) {
      console.error("❌ Validation Failed:", JSON.stringify(validated.error.format(), null, 2));
    } else {
      console.log("✅ Validation Succeeded!");
    }
  }
}

main();
