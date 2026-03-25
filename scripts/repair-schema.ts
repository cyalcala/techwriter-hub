import { createClient } from "@libsql/client/http";

async function repairSchema() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  const db = createClient({ url, authToken: token });

  console.log("🛠️ Attempting manual schema repair (adding missing columns)...");
  
  try {
    await db.execute("ALTER TABLE opportunities ADD COLUMN company_logo TEXT");
    console.log("✅ Added column: company_logo");
  } catch (e: any) {
    console.warn("⚠️ company_logo add failed (may already exist):", e.message);
  }

  try {
    await db.execute("ALTER TABLE opportunities ADD COLUMN metadata TEXT DEFAULT '{}'");
    console.log("✅ Added column: metadata");
  } catch (e: any) {
    console.warn("⚠️ metadata add failed (may already exist):", e.message);
  }

  console.log("🚀 Schema repair sequence complete.");
}

repairSchema();
