# Project Changelog

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
