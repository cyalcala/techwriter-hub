import { createClient } from "@libsql/client/http";
import { writeFileSync } from "fs";

async function exportStatic() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  const db = createClient({ url, authToken: token });

  console.log("💾 Exporting Turso records to static fallback...");
  
  const result = await db.execute("SELECT * FROM opportunities WHERE tier <= 3 ORDER BY latest_activity_ms DESC");
  const data = result.rows;

  writeFileSync("apps/frontend/src/db-local/static_fallback.json", JSON.stringify(data, null, 2));
  console.log(`✅ Exported ${data.length} records to static_fallback.json`);
}

exportStatic();
