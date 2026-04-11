import { createClient } from "@libsql/client/http";
import 'dotenv/config';

async function run() {
  const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const r = await c.execute('SELECT tier, COUNT(*) as count FROM opportunities WHERE is_active=1 GROUP BY tier');
  console.log(r.rows);
  c.close();
}
run();
