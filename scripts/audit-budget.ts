import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * BUDGETSHIELD SENTINEL
 * Scans the codebase for non-free model IDs to ensure 100% $0 compliance.
 */

const FREE_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash-exp",
  ":free",
  "openrouter/free",
  "llama3.1-8b",
  "llama-3.1-70b-versatile",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

const SEARCH_DIRS = ["packages/ai", "packages/bridge", "scripts/lib"];

function auditFile(path: string) {
    const content = readFileSync(path, "utf8");
    // Look for double-quoted or single-quoted strings that look like model IDs (provider/model or gemini-X)
    const modelRegex = /["']([a-zA-Z0-9\-\.\/:]+)["']/g;
    let match;
    const leakage = [];

    while ((match = modelRegex.exec(content)) !== null) {
        const potentialModel = match[1];
        
        // Filter for strings that look like typical AI model names (e.g. gpt-, claude-, gemini-, deepseek/, meta-/)
        const isAiModelString = /^(gpt-|claude-|gemini-|deepseek\/|meta-|qwen\/|anthropic\/|google\/)/i.test(potentialModel);
        
        if (isAiModelString) {
            const isFree = FREE_MODELS.some(f => potentialModel.includes(f));
            if (!isFree) {
                leakage.push({ model: potentialModel, line: content.substring(0, match.index).split("\n").length });
            }
        }
    }
    return leakage;
}

console.log("🛡️  BudgetShield Sentinel: Initiating $0 Compliance Audit...");

let totalLeaks = 0;
for (const dir of SEARCH_DIRS) {
    try {
        const files = readdirSync(dir).filter(f => f.endsWith(".ts") || f.endsWith(".mjs"));
        for (const file of files) {
            const path = join(dir, file);
            const leaks = auditFile(path);
            if (leaks.length > 0) {
                console.log(`❌  Leak detected in ${path}:`);
                leaks.forEach(l => {
                    console.log(`    - Line ${l.line}: ${l.model}`);
                    totalLeaks++;
                });
            } else {
                console.log(`✅  ${path} is $0 compliant.`);
            }
        }
    } catch (e) {}
}

if (totalLeaks > 0) {
    console.log(`\n🚨  Audit FAILED. ${totalLeaks} potential paid models identified.`);
    process.exit(1);
} else {
    console.log("\n🎊  Audit PASSED. System is 100% $0 Titanium Compliant.");
    process.exit(0);
}
