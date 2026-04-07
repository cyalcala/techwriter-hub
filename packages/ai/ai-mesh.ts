import { AIExtractionSchema, type AIExtraction } from '../db/validation';

/**
 * V12 SIFTER: Intelligent AI Mesh
 * 
 * Features:
 * 1. Fast-Triage (Cerebras/Groq) to drop trash quickly.
 * 2. Intelligent Rotation (OpenRouter Free Models) to bypass rate limits.
 * 3. Deep-Thinking Fallback (Gemini) for complex payloads.
 */

const SYSTEM_PROMPT = `
YOU ARE THE V12 INTELLIGENCE ENGINE (THE AGENTIC SIFTER).
Your mission is to EXTRACT structured data and SIFT for quality in a single pass.

### EXTRACTION RULES:
- Niche MUST be one of the pre-defined categories.
- Triage PH-compatibility and compensation signals.

### JSON OUTPUT FORMAT:
{
  "title": string,
  "company": string,
  "salary": string | null,
  "description": string,
  "niche": "CATEGORY",
  "type": "agency" | "direct",
  "locationType": "remote" | "hybrid" | "onsite",
  "tier": 0 | 1 | 2 | 3 | 4,
  "isPhCompatible": boolean,
  "relevanceScore": number (0-100)
}
`;

const TRIAGE_PROMPT = `
Identify if this job is Remote and PH-friendly (Worldwide/APAC). 
Also check if it's high-value (not low-ball $3/hr).
Answer ONLY with: PASSED or REJECTED.
`;

const OPENROUTER_FREE_MODELS = [
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-72b-instruct:free'
];

interface ModelConfig {
  name: string;
  provider: 'cerebras' | 'groq' | 'openrouter' | 'gemini';
  modelId: string;
}

export class AIMesh {
  private static extractJson(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  /**
   * PHASE 1: Fast Triage
   * Uses the fastest free models to drop garbage jobs before heavy processing.
   */
  static async triage(html: string): Promise<'PASSED' | 'REJECTED'> {
    const models: ModelConfig[] = [
      { name: 'cerebras-llama', provider: 'cerebras', modelId: 'llama3.1-8b' },
      { name: 'groq-llama', provider: 'groq', modelId: 'llama-3.1-70b-versatile' }
    ];

    for (const config of models) {
      try {
        const result = await this.callModel(config, TRIAGE_PROMPT, html.slice(0, 3000));
        if (result?.toUpperCase().includes('PASSED')) return 'PASSED';
        if (result?.toUpperCase().includes('REJECTED')) return 'REJECTED';
      } catch (err) {
        console.warn(`[AI-MESH] Triage model ${config.name} failed. Trying next...`);
      }
    }

    return 'PASSED'; // Default to pass if triage fails to be safe
  }

  /**
   * PHASE 2: Structured Extraction
   * Rotates through OpenRouter free models to find a winner.
   */
  static async extract(html: string): Promise<AIExtraction> {
    // 1. Shuffle OpenRouter rotation to spread load
    const rotatedModels = [...OPENROUTER_FREE_MODELS].sort(() => Math.random() - 0.5);
    
    const extractionQueue: ModelConfig[] = [
      ...rotatedModels.map(m => ({ name: `or-${m}`, provider: 'openrouter' as const, modelId: m })),
      { name: 'gemini-flash', provider: 'gemini', modelId: 'gemini-1.5-flash' }
    ];

    for (const config of extractionQueue) {
      try {
        console.log(`[AI-MESH] Attempting extraction with ${config.name}...`);
        const rawResult = await this.callModel(config, SYSTEM_PROMPT, html.slice(0, 10000));
        const json = this.extractJson(rawResult);
        const validated = AIExtractionSchema.safeParse(json);

        if (validated.success) {
          return { ...validated.data, metadata: { model: config.name } };
        }
      } catch (err) {
        console.error(`[AI-MESH] Model ${config.name} failed or timed out.`);
      }
    }

    throw new Error('[AI-MESH] CRITICAL: All models failed extraction.');
  }

  private static async callModel(config: ModelConfig, system: string, user: string): Promise<string> {
    switch (config.provider) {
      case 'cerebras':
        return this.fetchCerebras(config.modelId, system, user);
      case 'groq':
        return this.fetchGroq(config.modelId, system, user);
      case 'openrouter':
        return this.fetchOpenRouter(config.modelId, system, user);
      case 'gemini':
        return this.fetchGemini(config.modelId, system, user);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  private static async fetchCerebras(model: string, system: string, user: string) {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }

  private static async fetchGroq(model: string, system: string, user: string) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }

  private static async fetchOpenRouter(model: string, system: string, user: string) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0,
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }

  private static async fetchGemini(model: string, system: string, user: string) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\nCONTENT:\n${user}` }] }],
        generationConfig: { temperature: 0, response_mime_type: 'application/json' }
      })
    });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
}
