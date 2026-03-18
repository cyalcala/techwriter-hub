import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function fix() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    console.log("EXERTING MANUAL CONTROL OVER TURSO CLOUD...");
    
    await client.execute("ALTER TABLE agencies ADD COLUMN buzz_score INTEGER DEFAULT 0");
    console.log("SUCCESS: buzz_score added.");
    
    await client.execute("ALTER TABLE agencies ADD COLUMN created_at INTEGER");
    console.log("SUCCESS: created_at added.");

    const rs = await client.execute("PRAGMA table_info(agencies)");
    console.log("FINAL CLOUD SCHEMA:");
    console.log(JSON.stringify(rs.rows, null, 2));
    
  } catch (e) {
    console.error("MANUAL FIX FAILED:", e.message);
  } finally {
    client.close();
  }
}

fix();
