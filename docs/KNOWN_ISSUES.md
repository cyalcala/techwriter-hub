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
- **Status**: OPEN / MITIGATED
- **Symptom**: `trigger deploy` fails on Windows due to `@libsql/linux-x64-gnu` resolution.
- **Resolution**: Use `@libsql/client/http` and alias `@libsql/client` to `@libsql/client/http` in `trigger.config.ts`.

## 3. 2026-03-21 — Silent Blocker / CI/CD Stagnation
- **Status**: ESCALATED / PIPELINE BLOCKED
- **Symptom**: `harvest-opportunities` fetching 1080 items but processing 0. Feed stuck at 273 listings.
- **Root Cause 1**: Outdated sifter in cloud version `v20260320.14` is too aggressive. Fixed in `main` but not deployed due to CI/CD blockage.
- **Root Cause 2**: GitHub Actions workflow (`.github/workflows/trigger-deploy.yml`) was completely missing (Blockage A). Recreated and pushed, but failed during deployment.
- **Root Cause 3**: GitHub Actions deployment fails continuously returning non-zero exit code due to `BLOCKAGE E` (Missing `TRIGGER_ACCESS_TOKEN` secret in GitHub).
- **Resolution Path**: Code fixed and committed. Manual addition of `TRIGGER_ACCESS_TOKEN` to the remote repository's GitHub Secrets is required to unblock the pipeline. 
- **Hardening added**: `database-watchdog.ts` now actively monitors trigger tasks and outputs the current version to logs.
