#!/usr/bin/env bun
/**
 * Apex SRE Interrogator - Orchestration Script
 * 
 * This script runs the full SLO validation suite by leveraging triage.ts.
 * It is designed to be run from GitHub Actions or locally.
 */

import { $ } from "bun";

async function runSreSuite() {
  console.log("\n🚀 Starting Apex SRE Interrogator Suite...");
  const startTime = Date.now();

  // 1. Validate Environment
  const requiredVars = [
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "VERCEL_ACCESS_TOKEN",
    "TRIGGER_API_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
    // We don't exit(1) immediately to allow potential read-only checks if possible, 
    // but triage.ts will likely fail if it needs them.
  }

  try {
    // 2. Interrogate Phase (Detect)
    console.log("\n--- [PHASE 1] INTERROGATION (Zero-Trust Detection) ---");
    const detectResult = await $`bun run scripts/triage.ts --detect`.quiet();
    console.log(detectResult.stdout.toString());

    // Check if there are critical findings that require fixing
    const output = detectResult.stdout.toString();
    const hasCritical = output.includes("[CRITICAL]");

    if (hasCritical) {
      console.log("\n--- [PHASE 2] REMEDIATION (Applying Fixes) ---");
      // Run fix phase
      const fixResult = await $`bun run scripts/triage.ts --fix`.quiet();
      console.log(fixResult.stdout.toString());
    } else {
      console.log("\n✅ No critical anomalies detected. Skipping remediation.");
    }

    // 3. Final Certification
    console.log("\n--- [PHASE 3] CERTIFICATION (10-Gate Validation) ---");
    const certifyResult = await $`bun run scripts/triage.ts --certify`.quiet();
    const certOutput = certifyResult.stdout.toString();
    console.log(certOutput);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (certOutput.includes("ALL GATES PASSED")) {
      console.log(`\n🎉 Apex SRE Suite COMPLETED SUCCESSFULLY in ${totalTime}s.`);
      process.exit(0);
    } else {
      console.error(`\n❌ Apex SRE Suite FAILED Certification Gates after ${totalTime}s.`);
      
      // Optional: Trigger Vercel Redeploy if we have the webhook and things are still broken
      if (process.env.VERCEL_DEPLOY_WEBHOOK) {
        console.log("⚠️ Attempting emergency redeploy via Vercel Webhook...");
        const resp = await fetch(process.env.VERCEL_DEPLOY_WEBHOOK, { method: "POST" });
        if (resp.ok) {
          console.log("✅ Redeploy triggered successfully.");
        } else {
          console.error(`❌ Failed to trigger redeploy: ${resp.status} ${await resp.text()}`);
        }
      }
      
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`\n💥 FATAL ERROR during SRE Interrogation: ${error.message}`);
    process.exit(1);
  }
}

runSreSuite();
