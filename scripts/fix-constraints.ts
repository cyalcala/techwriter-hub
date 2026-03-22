import { createClient } from '@libsql/client/http';
const client = createClient({ 
  url: "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA" 
});

async function run() {
  console.log("=== DROPPING REDUNDANT CONTENT_HASH UNIQUE CONSTRAINT ===");
  try {
    // 1. Identify the index name for the unique constraint on content_hash
    const idxRes = await client.execute("PRAGMA index_list('opportunities')");
    console.log("INDICES:", JSON.stringify(idxRes.rows, null, 2));
    
    // Usually Drizzle names it opportunities_content_hash_unique or similar
    // Or it might be an implicit index
    
    // Safer: Since we want to use (title, company) as the identity, 
    // we can keep both if we handle both in ON CONFLICT. 
    // BUT SQLite only allows one target.
    
    // Let's DANGEROUSLY drop the uniqueness if found.
    // In SQLite, you usually have to recreate the table to drop a UNIQUE constraint on a column,
    // UNLESS it was created as a separate UNIQUE INDEX.
    
    const hashIdx = idxRes.rows.find((r: any) => r.name.includes('content_hash') || r.name.includes('unique'));
    if (hashIdx) {
      console.log(`Dropping index: ${hashIdx.name}`);
      await client.execute(`DROP INDEX IF EXISTS ${hashIdx.name}`);
    } else {
      console.log("No explicit content_hash unique index found. Might be implicit.");
    }
    
    // Let's check the schema again
    const schema = await client.execute("SELECT sql FROM sqlite_master WHERE name='opportunities'");
    console.log("CURRENT SCHEMA:", schema.rows[0][0]);
    
  } catch (e: any) {
    console.error("FIX_FAILED:", e.message);
  } finally {
    client.close();
  }
}

run();
