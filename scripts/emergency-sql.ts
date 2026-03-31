import { createClient } from "@libsql/client/http";

const URL = "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io";
const TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM4MjgzNzksImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.vrpUyXxt-cLEnXfxkJgAd3H6PMnfUQhPslLYmXPqnXxLiiUDMhLEcNX17dC6q4ZWUQLVusZ25kxCqosscUF8DQ";

const client = createClient({ url: URL, authToken: TOKEN });

async function fix() {
  console.log("Injecting Titanium Schema...");
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS extraction_rules (
        id TEXT PRIMARY KEY NOT NULL,
        source_name TEXT NOT NULL UNIQUE,
        jsonata_pattern TEXT NOT NULL,
        confidence_score INTEGER DEFAULT 0,
        sample_payload TEXT,
        last_validated_at INTEGER,
        created_at INTEGER
      );
    `);
    console.log("Table OK.");
    
    try {
      await client.execute("ALTER TABLE system_health ADD COLUMN consecutive_failures INTEGER DEFAULT 0;");
      console.log("Column OK.");
    } catch (e) {
      console.log("Column already exists or error.");
    }
    
    console.log("DONE.");
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

fix();
