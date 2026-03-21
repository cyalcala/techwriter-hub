# KNOWN ISSUES & RESOLUTIONS

## 1. Feed Empty / "No matching signals found" (Ref: Warden Protocol v2)
- **Status**: RESOLVED (2026-03-20)
- **Symptom**: Frontend shows "No matching signals found" while Health API reports active listings.
- **Root Causes**:
    - `ReferenceError`: `apps/frontend/src/pages/index.astro` attempted to query `opportunitiesTable` which was not defined (import was `opportunities`).
    - `ReferenceError`: Missing Drizzle imports for `not` and `asc` in `index.astro`.
- **Resolution**: Surgically corrected table reference and added missing imports. 
- **Verification**: Visual check confirmed 270+ listings live on production.

## 2. Trigger.dev Deployment - @libsql Native Binary Mismatch
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `trigger deploy` fails on Windows due to `@libsql/linux-x64-gnu` resolution.
- **Resolution**: Use `@libsql/client/http` and refactor database initialization to be ASYNCHRONOUS. This isolates environment-sensitive drivers from the Trigger.dev indexing phase.

## 3. 2026-03-21 — Silent Blocker / CI/CD Stagnation
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `harvest-opportunities` fetching 1080 items but processing 0. Feed stuck at 273 listings.
- **Root Cause**: GitHub Actions pipeline blocked by missing secrets and workflow configuration.
- **Resolution**: 
    1. Created `.github/workflows/trigger-deploy.yml`.
    2. User provided `TRIGGER_ACCESS_TOKEN`.
    3. Refactored `jobs/lib/db.ts` with dynamic imports to unblock indexing.
    4. Switched to `bun` runtime in `trigger.config.ts`.
- **Verification**: GitHub Action Run `23375287104` — SUCCESS. Target Version `20260321.14` live.
