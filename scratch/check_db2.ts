import { createLocalDb } from '../packages/db/client';
import { opportunities } from '../packages/db/schema';

async function check() {
  const {db} = await createLocalDb();
  const all = await db.select().from(opportunities);
  console.log("Total jobs:", all.length);
  console.log("Active jobs:", all.filter((x: any) => x.isActive).length);
  process.exit(0);
}
check();
