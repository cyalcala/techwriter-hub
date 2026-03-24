# APEX SRE Sentinel Wisdom Bank

This file serves as the persistent memory for the APEX SRE autonomous agent. It records lessons learned, architectural insights, and strategic optimizations to ensure the agent gets "wiser and wiser" over time.

## 🧠 Core Philosophy
- $0 Infrastructure cost always.
- Titanium-grade reliability.
- Conservative but decisive remediation.
- 15-minute evolution cycles for rapid learning.
- **Hono/Preact Purity**: Leverage Hono Middleware for edge-side instrumentation and Preact/JSX for ultra-thin interactive layers.

## 📚 Lessons Learned
*Initial archive empty. Waiting for first autonomous fix.*

## ⚡ Performance Baselines
- API Health Response: < 500ms
- Feed Latency: < 1500ms (uncached)

## 🛠️ Known Anti-Patterns
- Avoid complex regex in hot paths.
- Do not bypass Tiering logic for "speed" fixes.
- **Hono/HTMX**: Do not return full HTML layouts for partial `hx-get` requests; use `<>` fragments or specific components to minimize payload size.
- **Preact/JSX**: Ensure keys are unique in lists to prevent reconciliation death-spirals.
