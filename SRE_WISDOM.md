# 🛡️ SRE Wisdom: Autonomous Signal Harvesting (v2.0)
*Updated: 2026-03-31*

This document serves as the primary post-mortem and knowledge base for the **VA Freelance Hub** SRE team. It captures critical failure modes and recovery patterns discovered during platform operations.

## 1. Incident: The "Traumatic False Positive" (March 2026)

### Context
The platform reported **DEGRADED ⚠️** status even though ingestion was functioning correctly. This caused unnecessary recovery bursts and eroded trust in the monitoring system.

### Root Cause
- **Metric Decay**: The system used `max(created_at)` to judge health. 
- **Invariant Conflict**: As an "Update-First" engine, many job sightings refresh *existing* records rather than creating new ones. 
- **Failure**: The `created_at` timestamp remained stale (March 27), while the job content was fresh.

### Recovery Pattern (Titanium Logic)
- **Signal Swap**: Transitioned all health logic to `last_seen_at`. 
- **Frequency**: A successful scrape MUST update `last_seen_at` even on a partial match.
- **Outcome**: System trust restored. Pulse now reflects real-time activity.

---

## 2. Infrastructure: The Node.js 20 Invariant

### Incident
Vercel deployments failed silently or threw `libsql` driver errors when defaulted to Node 18 or 22.

### Resolution
- **Pinned Version**: Universal enforcement of **Node 20.x**.
- **Manual Patching**: The `.vc-config.json` in Vercel functions is audited during the build to ensure runtime adherence.
- **Lesson**: Do not trust build-adapter defaults on Edge platforms.

---

## 3. Automation: Idempotent Promotion

### Context
Overlapping CI/CD runs caused Trigger.dev to fail on the `promote` step (exit code 1) because the version was "already live."

### Implementation
- **Hardening**: Added `--config jobs/trigger.config.ts` and `|| true` to the promotion command in GitHub Actions.
- **Rationale**: A deployment that is "already live" is a success state, not a failure. This prevents false "Action Failed" emails.

---

## 4. Operation: The 15 RPM AI Guard

**NEVER** remove the 4-second delay in `jobs/lib/job-utils.ts`. 
- **Why**: Gemini 1.5 Flash Free Tier has a strict 15 RPM limit. 
- **Failure Mode**: Exceeding this limit triggers a 24-hour block, which cascade-fails the Healer (Matrix A) loop.

---

## 5. Continuity Checklist for Future AI Agents

1. **Verify Pulse**: Check `noteslog` for "SUCCESS" entries before any infrastructure changes.
2. **Path Adherence**: Always use `/jobs/trigger.config.ts` for Trigger operations.
3. **Runtime Loyalty**: Keep the project on Node 20.x until LibSQL officially supports higher versions on Vercel Serverless.

---

## 6. Project Aegis: The Eternal Sentinel (April 2026)

### Continuity Invariants
- **Phosphorus Shield**: Geographic and quality filtering is strictly enforced at the Kitchen layer (`isPhCompatible` and `tier < 4`). Signals that fail these boundaries are dropped immediately to prevent "Foreign Job Leakage."
- **Chronos Heartbeat**: Vector 5 is integrated into the Inngest fleet. It performs active 404/expired triage every 30 minutes, ensuring the site remains free of stale "Position Filled" ghosts.
- **50k-Year Perpetuity**: The system is anchored in $0-cost architectural loops. Budget thresholds in `ai-mesh.ts` autonomously rotate models to prioritize Free Tiers, ensuring financial sustainability for the extreme long-term.

### Resilience Patterns
- **Autonomous Repair**: The `ApexSentinel` verifies and repairs `vitals` table columns and schema indices at runtime. This "Live Migration" pattern prevents schema drift from breaking the platform.
- **Fail-Loud Logging**: Replaced silent `.catch(() => null)` blocks with granular error tracing to prevent "Watermelon Data" (where healthy metrics hide underlying ingestion rot).

---
**SRE WISDOM STATUS: PERSISTED.**
