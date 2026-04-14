import { createLocalDb } from '../packages/db/client';
import { opportunities } from '../packages/db/schema';
import { sql } from 'drizzle-orm';
async function check() {
  try {
    const {db} = await createLocalDb();
    const res = await db.select({ count: sql`count(*)` }).from(opportunities);
    console.log(`Jobs in DB: ${res[0].count}`);
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
check();
