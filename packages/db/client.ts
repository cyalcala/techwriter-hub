import { createClient, type Client as LibSQLClient } from "@libsql/client";
import { drizzle as drizzleLibSQL, type LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as drizzleD1, type D1Database } from "drizzle-orm/d1";
import * as dbSchema from "./schema";
import { sql } from "drizzle-orm";

/**
 * TechWriter Hub Sovereign Database Client
 * Support for both Cloudflare D1 (Edge) and LibSQL (Local/Scripts).
 */

export interface DbInstance {
  db: any;
  client?: LibSQLClient | D1Database;
  schema: typeof dbSchema;
  type: 'd1' | 'libsql';
}

let instance: DbInstance | null = null;

/**
 * Creates or returns the database instance.
 * @param d1Binding Optional Cloudflare D1 binding (from Astro.locals.runtime.env.DB)
 */
export function createDb(d1Binding?: D1Database): DbInstance {
  // Return existing instance if it matches the requested type
  if (instance) {
    if (d1Binding && instance.type === 'd1') return instance;
    if (!d1Binding && instance.type === 'libsql') return instance;
  }

  // Case 1: Cloudflare D1 (Production / Edge)
  if (d1Binding) {
    const db = drizzleD1(d1Binding, { schema: dbSchema });
    instance = { db, client: d1Binding, schema: dbSchema, type: 'd1' };
    return instance;
  }

  // Case 2: LibSQL (Local / Scripts / Turso)
  const url = process.env.TURSO_DATABASE_URL || "file::memory:";
  const authToken = process.env.TURSO_AUTH_TOKEN || "";

  const client = createClient({ url, authToken });
  const db = drizzleLibSQL(client, { schema: dbSchema });
  instance = { db, client, schema: dbSchema, type: 'libsql' };
  return instance;
}

// Global default instance (for local scripts)
export const { db, schema } = createDb();

/**
 * 🛰️ PULSE CHECK
 */
export async function dbAlive(database?: any): Promise<boolean> {
  const targetDb = database || db;
  try {
    await targetDb.run(sql`SELECT 1`);
    return true;
  } catch (e) {
    console.error(`[db] 💔 Database disconnected:`, e);
    return false;
  }
}
