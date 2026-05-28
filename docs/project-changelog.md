# Project Changelog

## 2026-05-28

### Added
- Completed Settings & Real Data Onboarding plan (phases 01-06).
- Real project CRUD at `/dashboard/settings/projects` with create/edit dialog, delete, and auto-select first project on workspace load.
- Real GSC + GA4 onboarding at `/dashboard/settings/integrations`: OAuth connect, site/property discovery, manual sync with row count feedback, disconnect, sync error display. Separate redirect URIs per provider.
- Team settings at `/dashboard/settings/team`: member list with roles, owner/admin role update, member remove with last-owner guard. Deferred invite delivery (no email provider in MVP).
- Cron verification: GitHub Actions workflow (`cron-sync.yml`) confirmed calling all four cron endpoints (`sync-gsc`, `sync-ga4`, `run-alerts`, `weekly-digest`) with `CRON_SECRET` guard.
- 3 new focused test suites for settings plan: project form validation, integration URL/body construction, team role gate logic.

### Validation
- `npm --workspace @seo-impact-os/web run type-check` → clean
- `npm --workspace @seo-impact-os/web run lint` → 0 warnings/errors
- `npm --workspace @seo-impact-os/web run test` → 46/46 pass (12 test files, +3 new settings tests)
- Root `npm run test` blocked by local Postgres `ECONNREFUSED` (expected; CI uses production DB env)

## 2026-05-24

### Added
- Completed v2 Phase 05 Goals & Sprint Management.
- Added project-scoped goals UI/API, sprint planning UI/API, workload chart, and SWR hooks for goals/sprints.
- Added sprint-filtered task board flow via `/dashboard/tasks?view=board&sprintId=...`.

### Fixed
- Replaced empty Radix Select item values with explicit all/none sentinels to avoid runtime crashes.
- Preserved query params when switching task views, so sprint filters survive Board/Timeline/Table/Calendar navigation.
- Split refined Zod goal/sprint schemas from base schemas so update schemas can use `.partial()` and production build can complete.

### Validation
- `npm --workspace @seo-impact-os/web run type-check`
- `npm --workspace @seo-impact-os/web run test` -> `20/20`
- `npm run lint`
- `npm run type-check`
- `npm run build` with local placeholder required env
- `npm run test` currently blocked by local Postgres `ECONNREFUSED` for API integration tests; web tests pass.

## 2026-05-19

### Changed
- Implemented v2 Phase 03 UI shell scaffold.
- Replaced active dashboard pages with shell placeholders or canonical redirects.
- Added grouped sidebar navigation, responsive mobile Sheet nav, workspace/project selectors, alert bell, user menu, and task `?view=` tabs.
- Added workspace and alert Zustand stores for Phase 03 shell state.
- Guarded persisted project selection and added a server localStorage shim for this Node runtime.

### Validation
- `npm --workspace @seo-impact-os/web run type-check`
- `npm --workspace @seo-impact-os/web run test` -> `16/16`
- `npm --workspace @seo-impact-os/web run lint`
- `npm --workspace @seo-impact-os/web run build` with local placeholder required env
- Code-reviewer re-review passed after mobile header, Sheet, and Collapsible fixes.

### Fixed
- Reconciled production Phase 02 schema drift with `0006_phase02_v2_schema_reconcile.sql`.
- Preserved old v1 business tables as `*_legacy_v1_20260519` instead of dropping data.
- Fixed workspace creation flow to stop redirecting when `organization.setActive` fails.

### Validation
- Local disposable DB: full migration chain applied successfully.
- Production DB: v2 `projects`, `tasks`, `goals`, `sprints`, and `task_templates` tables verified.
- Live auth smoke: signup `200`, organization create `200`, authenticated `GET /api/projects` `200`, authenticated `GET /api/tasks` `200`.
- `npm --workspace @repo/db run type-check`
- `npm --workspace @seo-impact-os/web run type-check`
- `npm --workspace @seo-impact-os/web run test` -> `16/16`
- `npm --workspace @seo-impact-os/web run lint`
- `npm --workspace @seo-impact-os/web run build`

## 2026-05-18

### Changed
- Simplified Phase 01 auth for internal MVP to email/password-only.
- Removed Better Auth Google login, signup email verification, password reset UI, invite email callback, and Resend dependency.
- Signup now auto-signs in and sends the user to workspace create/select.
- Updated v2 plan docs to defer email provider-dependent flows and keep Phase 03 unblocked.

### Fixed
- Fixed Phase 01 dashboard auth guard not running on local app routes.
- Replaced unregistered Next middleware placement with a server-side dashboard layout guard.
- Kept existing dashboard UI shell in a client `DashboardShell` component.

### Validation
- `HEAD /dashboard` -> `307 /login?redirect=/dashboard`
- `HEAD /dashboard/tasks` -> `307 /login?redirect=/dashboard`
- `GET /api/projects` without session -> `401 Unauthorized`
- `npm --workspace @seo-impact-os/web run type-check`
- `npm --workspace @seo-impact-os/web run test` -> `16/16`
- `npm --workspace @seo-impact-os/web run build`

## 2026-05-16

### Changed
- Synced v2 greenfield rebuild plan status with current evidence.
- Reclassified Phase 01 as code complete with live auth smoke pending.
- Normalized Phase 02 status to completed and clarified its review report was pre-implementation corrections, not a final pass report.
- Backfilled stale checklist items delivered by earlier phases: Phase 03 auth layout reuse and Phase 04 recurring-template unique constraint.

### Unresolved Questions
- Need decide whether future plan statuses should separate code complete from live-flow verified.

## 2026-05-14

### Changed
- Completed v2 Phase 02 data schema redesign.
- Replaced legacy serial business IDs with UUID IDs across projects, tasks, time logs, analytics rows, and integration connection tables.
- Replaced legacy `oauth_tokens`, `gsc_sites`, and `ga4_properties` with `gsc_connections` and `ga4_connections`.
- Adapted API routes, sync jobs, shared types, and current web task/project/integration surfaces to string UUID IDs and workspace scope.
- Removed stale duplicate API implementation from the dev-only `apps/api` wrapper.

### Added
- Added `goals`, `sprints`, `task_templates`, `alerts`, and `alert_reads` schema tables.
- Added DB test helpers for v2 workspace/user-required project and task inserts.

### Fixed
- Removed stale generated JS schema artifacts from `packages/db/src` so Drizzle resolves the TypeScript schema.
- Limited the dev-only `apps/api` wrapper type-check scope to the real entrypoint.
- Added workspace ownership checks before analytics reads and OAuth connection writes.
- Scoped test cleanup to test-owned workspace rows only.

### Validation
- `npm run type-check`
- `npx turbo run test --force`
- `npm run lint`
- `npm run build` with local placeholder environment variables

## Unresolved Questions

- Remote DB env still needs refresh before production schema push; default un-overridden connection points at stale Supabase project `jtdeuxvwcwtqzjndhrlg`.
