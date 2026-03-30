# 🛡️ VA.INDEX System Resilience & Autonomy

This document outlines the architectural patterns implemented to ensure the VA.INDEX platform remains "Snap-Fast," secure, and fully autonomous even under adverse conditions.

## 1. Circuit Breaker Pattern (Source Throttling)
To prevent "cascading failures" and avoid wasting AI credits on broken or rate-limited sources, the `harvest` engine implements a **Circuit Breaker**.

- **Detection**: Every source (RSS, Reddit, JSON, Agency) tracks its `consecutiveFailures` in the `systemHealth` table.
- **Trigger**: If a source fails **5 consecutive times**, its status is set to `CIRCUIT_OPEN`.
- **Enforcement**: The `harvest` job checks for open circuits at the start of each cycle. 
    - 🛑 **Throttled**: If a circuit is open, the source is skipped, and a warning is logged.
    - ✅ **Recovery**: To reset a circuit, a manual `OK` status update to the `systemHealth` table is required (or a successful automated probe if implemented).
- **Benefit**: Protects the system from "Zombie Tasks" that hang on failing network requests.

## 2. Agentic Healer (Self-Stabilizing Data)
When a signal from an upstream source violates our **Strict Zod Boundary**, the system triggers the **Agentic Healer**.

- **Boundary Breach**: If `OpportunitySchema.safeParse(item)` fails, the raw payload is sent to `healBatchWithLLM`.
- **LLM Intervention**: The healer uses Gemini (via `healBatchWithLLM`) to extract and restructure the data into a valid format.
- **Validation Loop**: The healed data is re-validated against the Zod schema. 
    - If it passes: The signal is ingested.
    - If it fails: The "poisoned signal" is bounced and logged for human audit.
- **Extraction Rules**: Valid extraction patterns (JSONata) can be cached in the `extraction_rules` table to reduce future LLM calls.

## 3. Titanium Database Connectivity
The database layer (`@va-hub/db`) has been hardened for serverless edge environments (Vercel Edge / Trigger.dev).

- **Singleton Pattern**: The `createDb()` function now returns a cached `instance`, preventing "Connection Exhaustion" in long-running processes or high-concurrency serverless triggers.
- **Increased Timeouts**: `busy_timeout` is set to **30,000ms (30s)**. This is critical for Turso (LibSQL) to mitigate `SQLITE_BUSY` errors during concurrent writes from multiple harvester instances.
- **Edge Deployment**: The `@libsql/client` is explicitly **externalized** in the Vite build to avoid symlink/CJS resolution issues on Windows and Vercel.

## 4. Atomic CI/CD Sync
The deployment pipeline guarantees that the Frontend and Backend always stay in sync.

- **Invariant Blocking**: Deployments to Trigger.dev are blocked unless the `bun test` suite (The "Invariant Suite") passes.
- **Migration Guard**: PRs are blocked if the database schema (`schema.ts`) and migrations (`packages/db/migrations/*`) are out of sync.
- **Frontend Sync**: Every successful Trigger.dev deployment automatically triggers a Vercel rebuild via a secure webhook, followed by a **Health Check** to ensure the Edge deployment is consistent.

---
**Status: TITANIUM-GRADE OPERATIONAL RESILIENCE.**
