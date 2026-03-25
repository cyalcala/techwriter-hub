import { createClient } from "@libsql/client/http";

/**
 * 🛡️ VA.INDEX BUDGET SHIELD
 * 
 * Enforces $0 cost constraints and prevents autonomous "runaway" behaviors.
 * Tracks AI quotas, execution stability, and repetitive failure loops.
 */

export interface BudgetConfig {
  agentId: string;
  dailyAiLimit?: number;
  maxSuccessiveFailures?: number;
}

export class BudgetShield {
  private agentId: string;
  private dailyLimit: number;
  private maxFailures: number;

  constructor(config: BudgetConfig) {
    this.agentId = config.agentId;
    this.dailyLimit = config.dailyAiLimit || 10;
    this.maxFailures = config.maxSuccessiveFailures || 3;
  }

  private getDb() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
    return createClient({ url, authToken: token });
  }

  /**
   * Check if the agent is within its daily AI budget.
   */
  async checkAiQuota(): Promise<boolean> {
    const db = this.getDb();
    const today = new Date().toISOString().split('T')[0];
    
    let result = await db.execute({
      sql: "SELECT ai_quota_count, ai_quota_date FROM vitals WHERE id = ?",
      args: [this.agentId]
    });

    if (result.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO vitals (id, ai_quota_count, ai_quota_date, successive_failure_count) VALUES (?, 0, ?, 0)",
        args: [this.agentId, today]
      });
      return true;
    }
    
    const row = result.rows[0];
    if (row.ai_quota_date !== today) {
      await db.execute({
        sql: "UPDATE vitals SET ai_quota_count = 0, ai_quota_date = ? WHERE id = ?",
        args: [today, this.agentId]
      });
      return true;
    }

    if (Number(row.ai_quota_count) >= this.dailyLimit) {
      console.error(`🛑 BUDGET EXCEEDED: ${this.agentId} reached daily AI limit (${this.dailyLimit}).`);
      return false;
    }
    return true;
  }

  async incrementAiQuota() {
    const db = this.getDb();
    await db.execute({
      sql: "UPDATE vitals SET ai_quota_count = ai_quota_count + 1 WHERE id = ?",
      args: [this.agentId]
    });
  }

  /**
   * Sanity check to prevent repetitive loops (Self-Correction Mechanism).
   */
  async validateStability(errorHash: string): Promise<boolean> {
    const db = this.getDb();
    const result = await db.execute({
      sql: "SELECT successive_failure_count, last_error_hash FROM vitals WHERE id = ?",
      args: [this.agentId]
    });

    if (result.rows.length === 0) return true;
    const row = result.rows[0];

    if (row.last_error_hash === errorHash) {
      const newCount = Number(row.successive_failure_count) + 1;
      await db.execute({
        sql: "UPDATE vitals SET successive_failure_count = ? WHERE id = ?",
        args: [newCount, this.agentId]
      });

      if (newCount >= this.maxFailures) {
        console.error(`🚨 LOOP DETECTED: Agent ${this.agentId} has failed with the same error ${newCount} times. ABORTING.`);
        return false;
      }
    } else {
      // Different error or first error, reset counter
      await db.execute({
        sql: "UPDATE vitals SET successive_failure_count = 1, last_error_hash = ? WHERE id = ?",
        args: [errorHash, this.agentId]
      });
    }
    return true;
  }

  async reportSuccess() {
    const db = this.getDb();
    await db.execute({
      sql: "UPDATE vitals SET successive_failure_count = 0, last_error_hash = NULL, last_recovery_at = ? WHERE id = ?",
      args: [Date.now(), this.agentId]
    });
  }
}
