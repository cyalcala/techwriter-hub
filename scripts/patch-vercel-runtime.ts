import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 🧬 SRE TITANIUM PATCH: Vercel Runtime Upgrade
 * Mandate: Force-upgrade legacy-stamped Astro v4 functions to Node 22.
 */

const walk = (dir: string): string[] => {
  let results: string[] = [];
  if (!existsSync(dir)) return results;
  
  const list = readdirSync(dir);
  for (const file of list) {
    const path = join(dir, file);
    const stat = statSync(path);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(path));
    } else {
      if (file === '.vc-config.json') {
        results.push(path);
      }
    }
  }
  return results;
};

const patch = () => {
  console.log('🛡️  Initiating SRE Titanium Patch: Vercel Metadata Surgery...');
  console.log(`📂 Current Working Directory: ${process.cwd()}`);
  
  // Search in .vercel/output/functions
  const functionsDir = join(process.cwd(), '.vercel', 'output', 'functions');
  console.log(`🔍 Searching in PRIMARY path: ${functionsDir}`);
  
  let configs = walk(functionsDir);
  
  if (configs.length === 0) {
    console.warn('⚠️  No .vc-config.json files found in PRIMARY path. Searching in APPS/FRONTEND...');
    const frontendDir = join(process.cwd(), 'apps', 'frontend', '.vercel', 'output', 'functions');
    console.log(`🔍 Searching in SECONDARY path: ${frontendDir}`);
    configs = walk(frontendDir);
  }
  
  if (configs.length === 0) {
    console.warn('⚠️  No .vc-config.json files found. Build artifact missing or path mismatched?');
    return;
  }

  
  let patchedCount = 0;
  for (const configPath of configs) {
    try {
      const content = readFileSync(configPath, 'utf8');
      if (content.includes('nodejs18.x')) {
        const updated = content.replace(/"runtime":\s*"nodejs18\.x"/g, '"runtime": "nodejs22.x"');
        writeFileSync(configPath, updated);
        patchedCount++;
        console.log(`✅ Patched: ${configPath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to patch: ${configPath}`, err);
    }
  }
  
  console.log(`💊 Surgery Complete: ${patchedCount} functions upgraded to Node 22.`);
};

patch();
