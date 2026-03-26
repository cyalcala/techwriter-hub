import { readFileSync } from "fs";

/**
 * Apex SRE Gemini AI Bridge
 * Interfaces with Google AI Studio (Gemini 1.5 Flash) for autonomous reasoning.
 * Designed for zero-dependency execution using native Bun fetch.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export interface FixProtocol {
  analysis: string;
  confidence: number; // 0-100
  action: "PATCH_CODE" | "REDEPLOY" | "RESTART_JOBS" | "ALERT_HUMAN";
  patches?: { path: string; content: string }[];
  explanation: string;
  wisdom?: string; // NEW: Lesson learned to be stored in SRE_WISDOM.md
}

export async function askGemini(errorContext: string, codebaseContext: string): Promise<FixProtocol> {
  if (!API_KEY) {
    throw new Error("[Sentinel Bridge] CRITICAL: GEMINI_API_KEY is not set.");
  }

  const prompt = `
YOU ARE THE APEX SRE SENTINEL. YOUR MISSION IS TO MAINTAIN THE VA-FREELANCE-HUB AT $0 COST.
**PERSONA**: YOU ARE A SENIOR SRE ENGINEER WHO HAS WORKED AT CLOUDFLARE (NETWORK-LEVEL RESILIENCE), NETFLIX (CHAOS-FIRST RECOVERY), AND GOOGLE (SYSTEMIC OBSERVABILITY).
YOU HAVE A "TITANIUM" ARCHITECTURAL BIAS: STICK TO THE GUARDRAILS IN THE ARCHITECTURE.MD.
**DIAGNOSTIC MODE**: YOU ARE OPERATING IN READ-ONLY DIAGNOSTIC MODE. YOU ARE NO LONGER AUTHORIZED TO EXECUTE PATCHES DIRECTLY. YOUR GOAL IS TO PROVIDE ACCURATE, MINIMAL DIAGNOSTICS AND REMEDIATION STEPS FOR A HUMAN ENGINEER.
**META-MISSION**: ANALYZE BUGS OR INEFFICIENCIES IN THE SRE SCRIPTS ('scripts/apex-sre.ts', 'scripts/triage.ts', 'scripts/lib/gemini.ts') AND SUGGEST IMPROVEMENTS.
**UI/UX MANDATE**: ENSURE THE FRONTEND IS "SNAP-FAST" (<100KB ASSET BLOAT).

### SRE WISDOM (PAST LESSONS):
${readFileSync("docs/SRE_WISDOM.md", "utf8")}

### CURRENT SYSTEM FAILURE:
${errorContext}

### CODEBASE CONTEXT:
${codebaseContext}

### YOUR INSTRUCTIONS:
1. ANALYZE THE ERROR AGAINST THE CODEBASE AND PAST WISDOM.
2. PROVIDED A STRATEGIC, MINIMAL DIAGNOSIS AND SUGGEST THE EXACT CODE CHANGE REQUIRED.
3. **CONSERVATIVE BIAS**: CHOOSE THE FIX WITH THE FEWEST LINES OF CODE CHANGED.
4. IF THE FIX REQUIRES $>5$ LINES OF COMPLEX LOGIC, CHOOSE "ALERT_HUMAN".
5. **WISDOM**: PROVIDE A ONE-SENTENCE LESSON LEARNED FOR THE KNOWLEDGE BASE.
6. RESPOND ONLY WITH A VALID JSON OBJECT:
{
  "analysis": "Root cause analysis and why deterministic triage missed it.",
  "confidence": 95,
  "action": "ALERT_HUMAN", 
  "patches": [{ "path": "path/to/file.ts", "content": "The proposed new file content" }],
  "explanation": "Detailed explanation of why this fix is best and stays within $0 cost.",
  "wisdom": "[Category] The lesson learned."
}
`;

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Conservative output for SRE
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Gemini Bridge] API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  try {
    let resultText = data.candidates[0].content.parts[0].text;
    
    // Manual JSON Extraction (v1 fallback)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      resultText = jsonMatch[0];
    }

    return JSON.parse(resultText) as FixProtocol;
  } catch (e) {
    throw new Error("[Gemini Bridge] Failed to parse AI response into FixProtocol JSON. Content: " + data?.candidates?.[0]?.content?.parts?.[0]?.text);
  }
}
