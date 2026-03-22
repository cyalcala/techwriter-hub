import { createClient } from "@libsql/client/http";
const c = createClient({
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function migrate() {
  console.log("=== SCHEMA MIGRATION: ADD CREATED_AT (RECOVERY) ===");
  try {
    await c.execute("ALTER TABLE opportunities ADD COLUMN created_at INTEGER");
    console.log("✅ Added `created_at` column.");
    const res = await c.execute("UPDATE opportunities SET created_at = scraped_at WHERE created_at IS NULL");
    console.log(`✅ Backfilled ${res.rowsAffected} records with their current scraped_at timestamp.`);
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("ℹ️ `created_at` already exists.");
    } else {
      console.error("Migration failed:", e.message);
    }
  }
  c.close();
}

migrate();
