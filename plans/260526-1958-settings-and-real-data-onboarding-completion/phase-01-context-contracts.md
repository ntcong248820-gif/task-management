---
phase: 1
title: "Context & Contracts"
status: complete
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Context & Contracts

## Overview

Lock the current contracts before UI work so Settings consumes existing v2 APIs instead of rebuilding backend logic.

## Requirements

- Functional: document exact project, integration, team, and cron contracts that the UI will call.
- Non-functional: no fake data, no duplicate integration logic in Next route handlers, keep workspace-scoped access through Hono/Better Auth middleware.

## Architecture

Settings is a client-side dashboard surface under the existing protected `/dashboard` layout. API calls go through the same-origin Hono app mounted at `/api`. Project and integration access must remain workspace-scoped by `activeOrganizationId`.

## Related Code Files

- Read: `docs/system-architecture.md`
- Read: `docs/codebase-summary.md`
- Read: `graphify-out/GRAPH_REPORT.md`
- Read: `packages/api-app/src/routes/projects.ts`
- Read: `packages/api-app/src/routes/integrations/index.ts`
- Read: `packages/api-app/src/routes/integrations/gsc.ts`
- Read: `packages/api-app/src/routes/integrations/ga4.ts`
- Read: `packages/api-app/src/routes/cron/index.ts`
- Read: `packages/auth-config/src/index.ts`
- Read: `packages/auth-config/src/permissions.ts`
- Read: `apps/web/src/lib/auth-client.ts`
- Read: `apps/web/src/stores/use-workspace-store.ts`

## Implementation Steps

1. Confirm current graph freshness against `git rev-parse HEAD`.
2. Record API contracts for:
   - `GET/POST/PUT/DELETE /api/projects`
   - `GET /api/integrations/status?projectId=...`
   - `GET /api/integrations/gsc|ga4/authorize?projectId=...`
   - `GET /api/integrations/gsc/sites?projectId=...&save=true`
   - `GET /api/integrations/ga4/properties?projectId=...&save=true`
   - `POST /api/integrations/gsc|ga4/sync`
   - `DELETE /api/integrations/:provider/disconnect?projectId=...`
3. Decide callback behavior:
   - Prefer redirecting directly to `/dashboard/settings/integrations`.
   - If keeping `/dashboard/integrations`, preserve `success` and `error` query params through the redirect shim.
4. Define frontend hook names and shared types before building pages:
   - `use-projects-settings.ts`
   - `use-integrations-settings.ts`
   - `use-team-settings.ts`
5. Confirm Team Settings boundary: member list and role visibility are in scope; email invitation delivery remains deferred unless explicitly enabled.

## Success Criteria

- [x] Scout report exists with relevant files and unresolved questions.
- [x] Plan phases reference live files, not stale v1 docs.
- [x] OAuth callback query param handling is explicitly chosen.
- [x] Team invite boundary is explicit before implementation.

## Risk Assessment

- Risk: stale legacy docs mention `/dashboard/integrations` and Render-era OAuth. Mitigation: use live route files and v2 architecture docs as source of truth.
- Risk: Better Auth organization client methods may differ from assumptions. Mitigation: verify method names in current installed package or generated types before coding.
