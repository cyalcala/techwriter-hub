
/**
 * 🧬 THE MACRO-SIEVE CLIENT (Tier 1)
 * Powered by Cerebras Inference Cloud
 * Model: Qwen 3 235B Instruct
 * Mandate: High-speed extraction, filtering, and routing of raw signal data.
 */

const API_KEY = process.env.CEREBRAS_API_KEY;
const MODEL = "qwen-3-235b-a22b-instruct-2507";
const ENDPOINT = "https://api.cerebras.ai/v1/chat/completions";

export interface MacroSieveResult {
  pass_to_tier2: boolean;
  rejection_reason: string | null;
  extracted_payload: {
    title: string;
    company: string | null;
    location: string | null;
    description: string;
    sourcePlatform: string | null;
    originalSourceUrl: string | null;
    intent: "JOB_POSTING" | "OTHER";
    niche: string | null;
    is_ph_compatible: boolean;
  } | null;
}

export async function extractMacroSieve(rawText: string, metadata: any = {}): Promise<MacroSieveResult> {
  if (!API_KEY) {
    throw new Error("[Cerebras Tier 1] CRITICAL: CEREBRAS_API_KEY not set.");
  }

  const prompt = `
YOU ARE THE MACRO-SIEVE (Tier 1).
YOUR MISSION: Extract structured job data from raw, messy text/HTML/XML and evaluate routing criteria.

### ROUTING CRITERIA:
1. **INTENT**: Is this definitively a job posting? (If it's an ad, blog post, or forum chatter, it is NOT a job).
2. **NICHE**: Is this relevant to the VA/Freelance Hub? (Virtual Assistant, Admin, EA, Customer Support, Marketing, Design, etc. Avoid high-end Software Engineering unless PH-specific).
3. **GEOGRAPHY**: Is it compatible with Filipino talent? (Explicitly PH-based, Remote Worldwide, or SEA-based. Reject if explicitly US/UK/EU ONLY).

### RAW SIGNAL INPUT:
${rawText.slice(0, 5000)} 

### METADATA:
${JSON.stringify(metadata, null, 2)}

### OUTPUT RULES:
- Respond ONLY with valid JSON. 
- "pass_to_tier2" must be TRUE if Intent is JOB_POSTING, Niche is relevant, and Geography is compatible.
- If "pass_to_tier2" is FALSE, provide a detailed "rejection_reason".

### JSON SCHEMA:
{
  "pass_to_tier2": boolean,
  "rejection_reason": string | null,
  "extracted_payload": {
    "title": "Cleaned Job Title",
    "company": "Company Name",
    "location": "Remote / Hybrid / Location",
    "description": "Succinct summary of the role",
    "sourcePlatform": "Platform Name (e.g. Reddit, LinkedIn, RSS)",
    "originalSourceUrl": "URL if found",
    "intent": "JOB_POSTING" | "OTHER",
    "niche": "VA | Admin | EA | Support | Marketing | Design | Other",
    "is_ph_compatible": boolean
  }
}
`;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[Cerebras Tier 1] API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content) as MacroSieveResult;
    
    return result;
  } catch (error) {
    console.error(`[Cerebras Tier 1] Handshake dropout: ${error instanceof Error ? error.message : error}`);
    // FAIL-CLOSED MANDATE: If the API drops, we fail the ingestion.
    return {
      pass_to_tier2: false,
      rejection_reason: "CEREBRAS_API_DROPOUT: Ingest failure.",
      extracted_payload: null
    };
  }
}
