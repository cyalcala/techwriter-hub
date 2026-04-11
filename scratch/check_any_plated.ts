import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config();

async function checkAnyPlated() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("=== CHECKING FOR ANY TRIGGER SIFTER JOBS ===\n");

  const total = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE source_platform LIKE 'Trigger Sifter%'");
  console.log(`Total Trigger Sifter Jobs: ${total.rows[0].cnt}`);

  const allSources = await client.execute("SELECT DISTINCT source_platform FROM opportunities LIMIT 20");
  console.log("\nAvailable Source Platforms:");
  allSources.rows.forEach(r => console.log(` - ${r.source_platform}`));

  client.close();
}

checkAnyPlated().catch(console.error);
