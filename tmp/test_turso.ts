import { createClient } from "@libsql/client/http";
const c = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_TOKEN! });

try {
  console.log("Connecting to Turso...");
  const rs = await c.execute("SELECT COUNT(*) FROM opportunities");
  console.log("Total opportunities:", rs.rows[0]);
} catch (e: any) {
  console.error("DIAGNOSTIC_ERROR:", e.message);
} finally { c.close(); }
