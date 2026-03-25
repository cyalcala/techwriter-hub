# VA.INDEX Stability Guardrails & Performance Ethos

> [!IMPORTANT]
> "Optimal and stable is okay. Avoid overengineering. Data health and speed are priority #1."

## 1. Engineering Guardrails
- **No Dependency Bloat**: Every new package must be vetted for bundle size and maintenance overhead. Prefer native Node/Bun APIs (e.g., `crypto.randomUUID()`) over external libraries.
- **Index-First Architecture**: All frontend-facing queries must be backed by a composite index. Current primary index: `(tier, latest_activity_ms)`.
- **Fail-Soft Default**: If a network or database call fails, the site MUST serve cached or static fallback data. Total site failure is unacceptable.
- **Titanium Sifter Authority**: The sifter is the final guardian of data health. Any new source or harvesting strategy must pass through the sifter before the database.

## 2. Heartbeat & Snapshot Integrity
- **Pulse**: The system maintains a 1-minute heartbeat logged to `https://va-freelance-hub-web.vercel.app/logs`.
- **Time Machine**: Automated snapshots (DB + Git state) occur every 15 minutes.
- **Registry Retention**: We maintain a rolling registry of the last 20 snapshots in `.backups/registry.json`.

## 3. Data Health Priorities
1. **Purity**: Zero noise (no tech/manager roles).
2. **Freshness**: Signals < 1h are highlighted with a glowing "Ultra Fresh" banner.
3. **Accessibility**: Prioritize roles reachable via direct portals or direct email.
