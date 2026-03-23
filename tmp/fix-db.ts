import { createClient } from "@libsql/client/http";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

console.log("🛠️  Manually patching Turso schema...");

try {
  await client.execute("ALTER TABLE opportunities ADD COLUMN latest_activity_ms INTEGER DEFAULT 0");
  console.log("✅ Column 'latest_activity_ms' added successfully.");
} catch (err: any) {
  if (err.message.includes("duplicate column name")) {
    console.log("ℹ️  Column already exists. Skipping.");
  } else {
    console.error("❌ Failed to add column:", err.message);
  }
}

try {
  await client.execute("CREATE INDEX IF NOT EXISTS tier_latest_idx ON opportunities (tier, latest_activity_ms)");
  console.log("✅ Index 'tier_latest_idx' created successfully.");
} catch (err: any) {
  console.error("❌ Failed to create index:", err.message);
}

client.close();
