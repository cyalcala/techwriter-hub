import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq, not } from "drizzle-orm";

async function syncFlags() {
  console.log("🛠️ SYNCHRONIZING DATABASE FLAGS...");
  
  // 1. Deactivate Tier 4 (Trash)
  const deactivate = await db.update(opportunities)
    .set({ isActive: false })
    .where(eq(opportunities.tier, 4));
  
  // 2. Activate Tiers 1, 2, 3 (Gold, Silver, Bronze)
  const activate = await db.update(opportunities)
    .set({ isActive: true })
    .where(not(eq(opportunities.tier, 4)));

  console.log("✅ Sync Complete: 'isActive' is now perfectly synced with (tier != 4).");
}

syncFlags().catch(console.error);
