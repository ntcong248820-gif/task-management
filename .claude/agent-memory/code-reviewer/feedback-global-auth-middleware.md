---
name: feedback-global-auth-middleware
description: workspaceId/userId set once globally in packages/api-app/src/app.ts before routes mount, not per-router — don't flag individual routers for missing auth wiring
metadata:
  type: feedback
---

**Rule**: `packages/api-app/src/app.ts` sets `c.set('userId', ...)` and `c.set('workspaceId', ...)` in global middleware (around line 117-118) before any feature router (`app.route('/alerts', alertsRoutes)` etc.) is mounted. Every route handler pulls these via `c.get('workspaceId')`/`c.get('userId')` and trusts they're already validated (session lookup happened earlier in the chain).

**Why**: Confirmed while reviewing Phase 5 alert-to-task routes (`packages/api-app/src/routes/alerts.ts`) — new `PATCH /:id/status` and `POST /:id/create-task` routes had no visible session/auth check inline, but this is correct because auth happens in shared app-level middleware, not per-router. Workspace isolation is enforced by scoping every query with `eq(alerts.workspaceId, workspaceId)` — that's the correct place to check, not for a session lookup in the route itself.

**How to apply**: When reviewing a new route in `packages/api-app/src/routes/*.ts` for "missing auth check," first confirm the router is mounted under the app in `packages/api-app/src/app.ts` after the auth middleware. Then the actual thing to verify per-route is workspace-scoping on every DB query (`eq(table.workspaceId, workspaceId)` in the `where` clause), not session validation.
