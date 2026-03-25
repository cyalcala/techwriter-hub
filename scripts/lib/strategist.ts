import { readFileSync, existsSync } from 'fs';
import { askGemini } from "./gemini";
import { createClient } from "@libsql/client/http";

/**
 * 🎨 THE STRATEGIST
 * 
 * Multi-persona deliberation engine for site "Betterment".
 * Analyzes past patterns and debates future strategies.
 */

export interface Strategy {
  id: string;
  title: string;
  description: string;
  personaArguments: {
    optimizer: string; // Speed/Perf
    harvester: string; // Data/Ethics
    architect: string; // Stability/$0 Budget
  };
  scores: {
    optimizer: number;
    harvester: number;
    architect: number;
  };
  actionProtocol: string; // Markdown or instruction for the agent
}

export class Strategist {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  private getDb() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    return createClient({ url, authToken: token });
  }

  /**
   * Aggregates historical context for deliberation.
   */
  async getContext(): Promise<string> {
    const changelogPath = 'CHANGELOG.md';
    let changelog = "No changelog found.";
    if (existsSync(changelogPath)) {
      changelog = readFileSync(changelogPath, 'utf8').split('\n').slice(0, 100).join('\n');
    }

    const db = this.getDb();
    const vitalsResult = await db.execute("SELECT * FROM vitals LIMIT 5");
    const healthResult = await db.execute("SELECT * FROM system_health ORDER BY updated_at DESC LIMIT 5");

    return `
### HISTORICAL CONTEXT (PAST):
${changelog}

### SYSTEM VITALS (PRESENT):
${JSON.stringify(vitalsResult.rows, null, 2)}

### HEALTH SNAPSHOT:
${JSON.stringify(healthResult.rows, null, 2)}
    `;
  }

  /**
   * Conducts a multi-persona debate on the current state.
   */
  async deliberate(): Promise<Strategy | null> {
    const context = await this.getContext();
    const prompt = `
YOU ARE THE VA.INDEX STRATEGIC ARCHITECT.
Detect patterns from the past and present to suggest the BEST next move for the site's betterment.

PROMPT Personas:
1. OPTIMIZER: Obsessed with SSR speed, bundle size, and 0ms latency.
2. HARVESTER: Obsessed with data freshness, job diversity, and ethical scraping.
3. ARCHITECT: Obsessed with $0 budget, lock safety, and preventing regressions.

DELIBERATION TASK:
Propose 2-3 competing strategies. Let each persona argue for/against them.
Score each strategy from 1-10 per persona.

OUTPUT JSON FORMAT:
{
  "strategies": [
    {
      "id": "strategy_1",
      "title": "...",
      "description": "...",
      "personaArguments": { "optimizer": "...", "harvester": "...", "architect": "..." },
      "scores": { "optimizer": 8, "harvester": 4, "architect": 9 },
      "actionProtocol": "..."
    }
  ]
}

CONTEXT:
${context}
    `;

    try {
      // Re-using askGemini for strategy generation
      // In a real scenario, we might want a specific 'askStrategist' with JSON schema
      const response = await askGemini("Plan a strategic betterment move", prompt);
      
      // Attempt to parse JSON from the response
      const jsonMatch = response.analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      const data = JSON.parse(jsonMatch[0]);
      if (!data.strategies || data.strategies.length === 0) return null;

      // Sensible Scoring Engine (Weighted)
      // Architect (Stability/Budget) has the highest weight (1.5)
      // Optimizer and Harvester have 1.0
      const bestStrategy = data.strategies.reduce((prev: any, curr: any) => {
        const prevScore = (prev.scores.optimizer * 1.0) + (prev.scores.harvester * 1.0) + (prev.scores.architect * 1.5);
        const currScore = (curr.scores.optimizer * 1.0) + (curr.scores.harvester * 1.0) + (curr.scores.architect * 1.5);
        return currScore > prevScore ? curr : prev;
      });

      return bestStrategy;
    } catch (e) {
      console.error("Strategy deliberation failed:", e);
      return null;
    }
  }
}
