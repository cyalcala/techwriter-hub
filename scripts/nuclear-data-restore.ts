import { db } from "../packages/db/client";
import { agencies, opportunities, logs } from "../packages/db/schema";
import { readFileSync, existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

async function run() {
  const name = process.argv[2] || "Hydra_2026-04-09T11-47-46";
  const filePath = `.backups/${name}.json`;
  
  console.log(`\n☢️  INITIATING NUCLEAR DATA RESTORE: ${name}...\n`);

  if (!existsSync(filePath)) {
    console.error(`❌ Backup not found at ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log(`-> Loading [${data.opportunities?.length || 0}] Opportunities from snapshot...`);

  const hydrateDates = (obj: any, keys: string[]) => {
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === "string") {
        obj[key] = new Date(obj[key]);
      }
    }
    return obj;
  };

  try {
    // 1. Clear current table (except for the audit traces)
    console.log("-> 1. Purging corrupted table...");
    // Filter out our traces if we want to keep them, but a full wipe is safer for restoration integrity
    await db.delete(opportunities);
    console.log("   [✓] Table cleared.");

    // 2. Inject Data
    console.log("-> 2. Injecting backup data...");
    if (data.opportunities && data.opportunities.length > 0) {
      const crypto = await import("node:crypto");
      const hydratedOpps = data.opportunities.map((o: any) => {
        const h = hydrateDates(o, ['postedAt', 'scrapedAt', 'createdAt', 'lastSeenAt']);
        if (!h.md5_hash) {
          h.md5_hash = crypto.createHash('md5').update(h.url + h.title).digest('hex');
          console.log(`   [!] Generated missing MD5 for: ${h.title}`);
        }
        return h;
      });
      const chunk = 50;
      for (let i = 0; i < hydratedOpps.length; i += chunk) {
        await db.insert(opportunities).values(hydratedOpps.slice(i, i + chunk));
        if (i % 250 === 0) console.log(`   ...Injected ${i}/${hydratedOpps.length}`);
      }
    }
    console.log(`   [✓] Successfully injected ${data.opportunities.length} opportunities.`);

    // 3. Log the Nuclear Event
    await db.insert(logs).values({
      id: uuidv4(),
      message: `NUCLEAR RESTORE: Re-hydrated Vault with ${data.opportunities.length} records from ${name}.`,
      level: "snapshot",
      timestamp: new Date()
    });

    console.log("\n✅ Vault Re-hydrated. Proceeding to Emergency Backfill (Warming)...");
  } catch (err) {
    console.error("\n❌ NUCLEAR RESTORE FAILED:", err);
  }
}

run().catch(console.error);
