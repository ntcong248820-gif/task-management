# Phase 3 Completion Report — Sync Health & Source Management

Date: 2026-08-16 (session)
Status: **completed**

## Scope Delivered

- Migration `0009_integration_sync_health.sql` (`packages/db/migrations/`): added `is_active`, `last_attempted_at`, `last_rows_synced`, `last_duration_ms` to `gsc_connections` / `ga4_connections`; partial unique indexes enforce exactly one active GSC source and one active GA4 source per `(workspace_id, project_id)`, plus unique resource rows per `(workspace_id, project_id, site_url/property_id)`. Applied to production via a throwaway vitest test (`db.execute(sql.raw(stmt))` per statement) after the plain Node/tsx/drizzle-kit CLI path repeatedly failed DNS resolution (`ENOTFOUND tenant/user postgres.jtdeuxvwcwtqzjndhrlg`) against the Supabase pooler — vitest's process bootstrap connected successfully where standalone Node processes did not; root cause of that discrepancy was not fully diagnosed, only worked around.
- `packages/api-app/src/utils/integration-health.ts`: pure `deriveHealthState()` — `syncing` (with 15-min stuck-timeout escalation to `error`), `needs_reconnect` (via `isInvalidGrantError`, matches `invalid_grant` in OAuth errors), `error`, `stale` (>36h since last success), `healthy`.
- `packages/api-app/src/routes/integrations/{gsc,ga4}.ts`: source-change confirmation flow (`confirmSourceChange` flag, 409 + `requiresConfirmation` when switching sources without confirmation), deletion of old provider's analytics rows scoped to `(projectId, provider)` on confirmed switch, health fields (`lastAttemptedAt`, `lastRowsSynced`, `lastDurationMs`) written on both success and failure paths.
- `packages/api-app/src/routes/integrations/index.ts`: `/status` endpoint returns derived `healthState` for both providers, now wired with `lastAttemptedAt` for the stuck-syncing check.
- `packages/api-app/src/jobs/sync-gsc.ts` / `sync-ga4.ts`: cron jobs filter on `isActive = true` and write the same health fields as manual sync routes.
- `apps/web/src/hooks/use-integrations-settings.ts` + `apps/web/src/components/features/settings/integration-card.tsx`: UI renders `HealthBadge` per `healthState`, shows last attempt/last sync/rows synced, source-change confirmation dialog.

## Verification

- Tests: 96/96 passing repo-wide (11 in `integration-health.test.ts`, including new stuck-syncing-timeout case; 6 in `analytics-provenance.test.ts`; rest across api/web).
- Lint: clean (`next lint`, 0 warnings/errors).
- Type-check: clean across all 8 packages (`turbo run type-check`).
- Code review: CRITICAL/HIGH findings in `gsc.ts` addressed (stale/needs_reconnect/error/healthy branch logic); `index.ts` findings addressed (`lastAttemptedAt` wiring).

## Plan Sync-Back

- `phase-03-sync-health-source-management.md`: `status: completed`, all 9 Todo + 6 Success Criteria checkboxes marked `[x]`.
- Full-plan sweep (via project-manager agent): Phase 1 backfilled to reflect 2026-07-10 verification evidence (status remains "Pass w/ Concerns" — OAuth/region blockers unresolved, not part of Phase 3 scope). Phase 2 already correct (completed). Phases 4–7 confirmed correctly pending, no work started.

## Known Gaps / Unresolved Questions

1. Root cause of the Node/tsx/drizzle-kit-CLI vs vitest DNS-resolution discrepancy against the Supabase pooler was never diagnosed — only worked around. Worth revisiting if it blocks future migrations.
2. Reviewer flagged a route-level regression scenario (duplicate-active-row / OAuth-callback-level source-switch race) that isn't covered by a dedicated integration test — current tests cover `deriveHealthState`/`isInvalidGrantError` at the unit level and DB-level partial-unique-index enforcement, not a full OAuth-callback race simulation. Not blocking (DB constraint is the actual enforcement mechanism), but flagged for Phase 4 awareness if analytics dashboards start relying on active-source assumptions.
3. Phase 1's "Pass w/ Concerns" status (region mismatch, OAuth passkey access blocked) predates this phase and is unrelated to Phase 3 scope — carried forward as-is, not resolved here.
