import { db, schema } from '../packages/db/client';
import { eq, or } from 'drizzle-orm';

async function resetCircuits() {
  console.log("🛠️ SRE INTERVENTION: Resetting all tripped circuit breakers...");
  try {
    const result = await db.update(schema.systemHealth)
      .set({ 
        status: 'OK', 
        consecutiveFailures: 0, 
        errorMessage: 'Manually reset by SRE Operator',
        updatedAt: new Date()
      })
      .where(
        or(
          eq(schema.systemHealth.status, 'CIRCUIT_OPEN'),
          eq(schema.systemHealth.status, 'FAIL')
        )
      )
      .returning({ name: schema.systemHealth.sourceName });

    console.log(`✅ Reset ${result.length} circuits.`);
    for (const r of result) console.log(`   - ${r.name}`);
  } catch (e) {
    console.error("❌ Failed to reset circuits:", e);
  }
}

resetCircuits();
