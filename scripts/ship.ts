#!/usr/bin/env bun
/**
 * VA.INDEX Utility: Interactive Commit & Push
 * Checks for staged files, prompts the user for a semantic commit message,
 * executes the commit, and automatically pushes to the remote repository.
 */

import { execSync } from "child_process";

const G = "\x1b[32m", C = "\x1b[36m", Y = "\x1b[33m", R = "\x1b[31m", RESET = "\x1b[0m", BOLD = "\x1b[1m";

console.log(`${BOLD}${C}📝 Initiating Git Commit & Push Sequence...${RESET}\n`);

try {
  // 1. Check if there are actually files staged and ready to commit
  const stagedFiles = execSync("git diff --cached --name-only").toString().trim();
  
  if (!stagedFiles) {
    console.log(`${Y}⚠️  No files staged for commit.${RESET}`);
    console.log(`Run ${BOLD}'bun run scripts/stage.ts'${RESET} first to stage your changes.`);
    process.exit(0);
  }

  // Show the user what they are about to commit
  console.log(`${G}Files ready to ship:${RESET}\n\x1b[2m${stagedFiles}${RESET}\n`);

  // 2. Prompt for the commit message using Bun's native synchronous prompt
  const message = prompt(`${BOLD}Enter commit message (or press Ctrl+C to abort):${RESET} `);

  if (!message || message.trim() === "") {
    console.log(`\n${R}❌ Commit aborted: Message cannot be empty.${RESET}`);
    process.exit(1);
  }

  // 3. Execute the commit
  console.log(`\n${C}Locking in changes...${RESET}`);
  const commitOutput = execSync(`git commit -m "${message.trim()}"`).toString().trim();
  console.log(`${G}✅ Commit successful!${RESET}`);
  console.log(`\x1b[2m${commitOutput}${RESET}\n`);
  
  // 4. Execute the push
  console.log(`${C}🚀 Pushing to remote repository...${RESET}`);
  execSync(`git push`, { stdio: "inherit" }); // Inherit shows the live upload progress
  
  console.log(`\n${G}✅ Code successfully shipped! Vercel build is now live.${RESET}`);

} catch (error: any) {
  console.error(`\n${R}❌ Sequence failed.${RESET}`);
  if (error.stdout) console.error(error.stdout.toString().trim());
  if (error.stderr) console.error(error.stderr.toString().trim());
  process.exit(1);
}
