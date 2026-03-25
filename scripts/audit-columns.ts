import { createClient } from "@libsql/client/http";

async function auditColumns() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  const db = createClient({ url, authToken: token });

  console.log("🕵️ Auditing remote 'opportunities' table info...");
  const result = await db.execute("PRAGMA table_info(opportunities)");
  console.log(JSON.stringify(result.rows, null, 2));
}

auditColumns();
