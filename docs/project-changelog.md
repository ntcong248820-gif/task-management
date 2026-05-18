# Project Changelog

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
