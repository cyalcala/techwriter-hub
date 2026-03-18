import { db } from "../packages/db/client";
import { agencies, opportunities } from "../packages/db/schema";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

async function run() {
  const name = process.argv[2];
  if (!name) {
    console.error(`\n❌ Missing Restore Point! Usage: bun run restore <Mythic_Name_Timestamp>\n`);
    process.exit(1);
  }

  console.log(`\n🔥 Initiating System Restoration to [${name}]...\n`);

  const filePath = `.backups/${name}.json`;
  if (!existsSync(filePath)) {
    console.error(`❌ Could not find database backup for ${name} at ${filePath}.`);
    process.exit(1);
  }

  try {
    // 1. Restore Codebase
    console.log("-> 1. Rewinding Codebase...");
    execSync(`git checkout ${name}`);
    console.log(`   [✓] Codebase safely rolled back.`);

    // 2. Restore Database
    console.log("-> 2. Formatting Database...");
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    
    // Wipe
    await db.delete(agencies);
    await db.delete(opportunities);
    console.log(`   [✓] Database Wiped.`);

    // Insert
    if (data.agencies && data.agencies.length > 0) {
      await db.insert(agencies).values(data.agencies);
    }
    if (data.opportunities && data.opportunities.length > 0) {
      // Need to chunk opportunities if it's too large, but for 1,000s it's fine natively
      const chunk = 100;
      for (let i = 0; i < data.opportunities.length; i += chunk) {
        await db.insert(opportunities).values(data.opportunities.slice(i, i + chunk));
      }
    }

    console.log(`   [✓] Restored ${data.agencies?.length || 0} Agencies and ${data.opportunities?.length || 0} Opportunities.`);

    console.log(`\n✅ System Fully Restored to [${name}].\n`);
    console.log(`If you wish to return to the future, you must: git checkout main`);

  } catch (err) {
    console.error(`\n❌ Failed to restore:`, err);
  }
}

run();
