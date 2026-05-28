# Scout Report — Settings + Real Data Onboarding

## Scope

Read `graphify-out/GRAPH_REPORT.md`, v2 docs, current settings pages, project/workspace stores, API routes, Google integration routes, cron routes, and related plans.

## Current Findings

- Graph is current with `HEAD` (`f4508c7c`) and highlights the same hubs this plan touches: projects, GSC/GA4 routes, signed OAuth state, cron, Better Auth organization, and settings placeholders.
- Settings pages are still shells:
  - `apps/web/src/app/dashboard/settings/projects/page.tsx`
  - `apps/web/src/app/dashboard/settings/team/page.tsx`
  - `apps/web/src/app/dashboard/settings/integrations/page.tsx`
- Redirect shims exist:
  - `/dashboard/projects` -> `/dashboard/settings/projects`
  - `/dashboard/integrations` -> `/dashboard/settings/integrations`
- Project backend is already real and workspace-scoped:
  - `GET/POST/PUT/DELETE /api/projects`
  - Schema: `packages/api-app/src/schemas/project-schema.ts`
  - Store: `apps/web/src/stores/use-workspace-store.ts`
- GSC/GA4 backend is already real:
  - `GET /api/integrations/status?projectId=...`
  - `GET /api/integrations/gsc/authorize?projectId=...`
  - `GET /api/integrations/ga4/authorize?projectId=...`
  - `GET /api/integrations/gsc/sites?projectId=...&save=true`
  - `GET /api/integrations/ga4/properties?projectId=...&save=true`
  - `POST /api/integrations/gsc/sync`
  - `POST /api/integrations/ga4/sync`
  - `DELETE /api/integrations/:provider/disconnect?projectId=...`
- OAuth state is signed and bound to user/workspace/project in `packages/api-app/src/utils/signed-oauth-state.ts`.
- Team roles exist in Better Auth organization config and permissions, but no current Settings Team UI is wired.
- GitHub Actions cron currently triggers only GSC and GA4 sync. Phase 06 cron endpoints for alerts and digest exist, but `.github/workflows/cron-sync.yml` does not call them yet.

## Relevant Files

- `graphify-out/GRAPH_REPORT.md` — graph snapshot and community hubs.
- `docs/system-architecture.md` — current v2 architecture, OAuth flows, cron, state management.
- `docs/codebase-summary.md` — canonical module map; confirms settings placeholders.
- `docs/project-roadmap.md` — v2 phases 01-07 marked done; root tests need local Postgres.
- `plans/260510-1600-v2-greenfield-rebuild/plan.md` — upstream source of truth; all v2 phases complete but settings shells remain a post-plan gap.
- `packages/api-app/src/routes/projects.ts` — real workspace-scoped project CRUD.
- `packages/api-app/src/routes/integrations/*.ts` — real GSC/GA4 OAuth, discovery, sync, disconnect.
- `packages/api-app/src/routes/cron/*.ts` — cron endpoints for sync, alerts, and digest.
- `apps/web/src/stores/use-workspace-store.ts` — fetches projects and reconciles selected project.
- `apps/web/src/lib/auth-client.ts` — Better Auth client with organization plugin.
- `packages/auth-config/src/permissions.ts` — owner/admin/member/viewer ACL.

## Plan Decision

Create a new post-v2 plan instead of extending the v2 rebuild plan. This work converts existing placeholders and backend contracts into a usable onboarding flow: create project, connect GSC/GA4, sync real data, and manage team visibility.

## Unresolved Questions

- Should Team Settings include real email invitations now, or remain list/roles only until an email provider is intentionally added?
- Should OAuth callbacks be changed to `/dashboard/settings/integrations`, or should the existing `/dashboard/integrations` redirect preserve success/error query params?
