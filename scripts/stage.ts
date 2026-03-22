#!/usr/bin/env bun
/**
 * VA.INDEX Utility: Stage All Changes
 * Simply stages all modified, deleted, and new files to Git,
 * and prints a clean summary of what is ready to be committed.
 */

import { execSync } from "child_process";

const G = "\x1b[32m", C = "\x1b[36m", RESET = "\x1b[0m", BOLD = "\x1b[1m";

console.log(`${BOLD}${C}📦 Initiating Git Staging Sequence...${RESET}\n`);

try {
  // 1. Stage all changes
  execSync("git add -A", { stdio: "pipe" });
  
  // 2. Grab the short-form status to show what was staged
  const status = execSync("git status --short").toString().trim();
  
  if (!status) {
    console.log(`${G}✅ Tree is clean. No changes to stage.${RESET}`);
  } else {
    console.log(`${G}✅ All changes successfully staged!${RESET}\n`);
    console.log(`${BOLD}📊 Staged Files:${RESET}`);
    console.log(status);
  }
} catch (error: any) {
  console.error(`\n❌ Failed to stage changes. Are you in a valid git repository?`);
  console.error(error.message);
  process.exit(1);
}
