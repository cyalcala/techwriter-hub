import { drizzle as drizzleD1, type D1Database } from "drizzle-orm/d1";
import * as dbSchema from "./schema";
import { sql } from "drizzle-orm";

/**
 * TechWriter Hub Sovereign Database Client
 * Support for both Cloudflare D1 (Edge) and LibSQL (Local/Scripts).
 */

export interface DbInstance {
  db: any;
  client?: any;
  schema: typeof dbSchema;
  type: 'd1' | 'libsql';
}

let instance: DbInstance | null = null;

/**
 * Creates or returns the database instance.
 * @param d1Binding Optional Cloudflare D1 binding (from Astro.locals.runtime.env.DB)
 */
export function createDb(d1Binding?: D1Database): DbInstance {
  // Case 1: Cloudflare D1 (Production / Edge)
  if (d1Binding) {
    try {
      const db = drizzleD1(d1Binding, { schema: dbSchema });
      return { db, client: d1Binding, schema: dbSchema, type: 'd1' };
    } catch (err) {
      console.error("Drizzle D1 local init failed, retrying plain init...");
      const db = drizzleD1(d1Binding);
      return { db, client: d1Binding, schema: dbSchema, type: 'd1' };
    }
  }

  // Case 2: LibSQL
  throw new Error("Edge Environment detected: Missing D1 Binding.");
}

/**
 * Node-only initializer for local scripts
 */
export async function createLocalDb(): Promise<DbInstance> {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  
  const url = process.env.TURSO_DATABASE_URL || "file::memory:";
  const authToken = process.env.TURSO_AUTH_TOKEN || "";

  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema: dbSchema });
  instance = { db, client, schema: dbSchema, type: 'libsql' };
  return instance;
}

// 🛰️ PULSE CHECK
export async function dbAlive(database?: any): Promise<boolean> {
  const targetDb = database;
  if (!targetDb) return false;
  try {
    await targetDb.run(sql`SELECT 1`);
    return true;
  } catch (e) {
    console.error(`[db] 💔 Database disconnected:`, e);
    return false;
  }
}
