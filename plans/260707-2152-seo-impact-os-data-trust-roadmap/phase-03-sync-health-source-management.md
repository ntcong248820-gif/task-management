---
phase: 3
title: "Sync Health Source Management"
status: completed
priority: P1
effort: "2-3d"
dependencies: [1, 2]
---

# Phase 3: Sync Health Source Management

## Context Links

- `packages/db/src/schema/gsc-connections.ts`
- `packages/db/src/schema/ga4-connections.ts`
- `packages/api-app/src/routes/integrations/index.ts`
- `packages/api-app/src/routes/integrations/gsc.ts`
- `packages/api-app/src/routes/integrations/ga4.ts`
- `packages/api-app/src/jobs/sync-gsc.ts`
- `packages/api-app/src/jobs/sync-ga4.ts`
- `.github/workflows/cron-sync.yml`

## Overview

Make source selection explicit and make sync state honest. The UI should show Healthy, Stale, Needs reconnect, Syncing, or Error with rows and last attempt.

## Key Insights

- Current connection tables store `lastSyncedAt`, `syncStatus`, and `syncError`, but not last attempt or rows synced.
- Multiple connection rows per project can exist; current "latest updated" behavior is not an explicit active-source model.
- Full sync-run history is useful but not required for MVP; summary columns are enough.
- Duplicated health columns on GSC/GA4 connection tables are intentional KISS for this phase.
- Product decision: one project uses one GSC site and one GA4 property. Changing source deletes old provider analytics data.

## Requirements

- Functional: one active source per provider/project, explicit destructive source-change flow, health summary in API/UI.
- Non-functional: no silent source changes, no green status with zero-row error, no token exposure.

## Architecture

Add active-source and health summary fields to connection tables:
- `is_active boolean default true`
- `last_attempted_at timestamp`
- `last_rows_synced integer`
- optional `last_duration_ms integer`
- keep `last_synced_at` as last success
- keep `sync_error` as latest human-readable error

Add partial unique indexes for one active provider resource per project:
- active GSC per `(workspace_id, project_id)`.
- active GA4 per `(workspace_id, project_id)`.
- unique resource rows per `(workspace_id, project_id, site_url/property_id)`.

Use raw SQL migrations for partial unique indexes if Drizzle helpers cannot express the needed `WHERE is_active = true` constraints clearly.

Source switch policy:
- User selects a different GSC site or GA4 property.
- UI/API requires explicit confirmation: old analytics data for that provider/project will be deleted.
- Delete old provider rows for that project/provider, deactivate siblings, activate selected source, then run fresh sync.
- Preserve project, workspace, tasks, and settings. Do not preserve old provider metrics.

## Related Code Files

- Modify: `packages/db/src/schema/gsc-connections.ts`
- Modify: `packages/db/src/schema/ga4-connections.ts`
- Create: `packages/db/migrations/{timestamp}_integration_sync_health.sql`
- Modify: `packages/api-app/src/routes/integrations/index.ts`
- Modify: `packages/api-app/src/routes/integrations/gsc.ts`
- Modify: `packages/api-app/src/routes/integrations/ga4.ts`
- Modify: `packages/api-app/src/jobs/sync-gsc.ts`
- Modify: `packages/api-app/src/jobs/sync-ga4.ts`
- Modify: `apps/web/src/hooks/use-integrations-settings.ts`
- Modify: `apps/web/src/components/features/settings/integration-card.tsx`

## Implementation Steps

1. Add connection health fields and active-source flags.
2. Backfill `isActive=true` for the most recently updated connection per provider/project; set older rows inactive.
   - emit a migration/runbook note listing chosen active source per project.
   - require human confirmation in Phase 1/acceptance when current production source matters.
3. Add active-source unique constraints.
4. Update OAuth callback to mark selected/auto-selected resource active and deactivate siblings.
5. Update discover/select sync flow:
   - user selects resource
   - confirm source change if an active source already exists and selected resource differs
   - delete old provider analytics rows for the project after confirmation
   - selected row becomes active
   - sync starts only for active resource
6. Update cron jobs:
   - set `lastAttemptedAt` and `syncStatus='syncing'` before provider call.
   - on success set `lastSyncedAt`, `lastRowsSynced`, `syncStatus='idle'`, `syncError=null`.
   - `lastRowsSynced` means provider fact rows written for that connection, not number of projects/connections processed.
   - on failure set `syncStatus='error'`, `syncError`, `lastRowsSynced=0`.
7. Update manual sync routes with same semantics.
8. Extend status endpoint with derived health state:
   - `healthy`: last success recent and no error.
   - `stale`: last success older than threshold.
   - `needs_reconnect`: token refresh error like `invalid_grant`.
   - `error`: other sync error.
   - `syncing`: in progress.
9. Update integration card to show health state, last attempt, last success, rows, source, and "Change source".
10. Add tests for source-switch deletion:
   - GSC source change deletes old project GSC raw/aggregated rows.
   - GA4 source change deletes old project GA4 rows.
   - project/tasks/settings are not deleted.
11. Add unit tests for health derivation and request body construction.

## Todo List

- [x] Connection health migration.
- [x] Active-source migration/backfill.
- [x] Cron and manual sync update health fields.
- [x] Status endpoint returns derived health.
- [x] UI shows health states.
- [x] Source change requires confirmation.
- [x] Source change deletes old provider analytics data.
- [x] Tests cover `invalid_grant -> needs_reconnect`.
- [x] `lastRowsSynced` is real row count from provider write path.

## Success Criteria

- [x] Exactly one active GSC source and one active GA4 source per project.
- [x] Settings card makes stale/error/reconnect visible without reading logs.
- [x] Cron green cannot hide provider errors.
- [x] User can change source intentionally.
- [x] After source change, reports only use freshly synced active-source rows.
- [x] Tests pass.

## Risk Assessment

- Risk: active-source migration picks wrong row. Mitigation: choose latest updated and surface confirmation in Phase 1 acceptance.
- Risk: `synced=0` can be legitimate for tiny sites. Mitigation: distinguish zero rows with no provider error from token/API failures.
- Risk: health state duplicates logic in UI. Mitigation: derive health on API, UI only renders.
- Risk: Drizzle does not encode partial active-source indexes portably. Mitigation: raw SQL migration plus integration test.
- Risk: destructive source switch surprises user. Mitigation: confirmation copy must name old source, new source, and data deletion scope.

## Security Considerations

- Do not expose raw Google tokens or detailed OAuth internals.
- Keep workspace/project scoping on all status and source-change endpoints.

## Next Steps

Phase 4 uses derived health/source metadata on analytics pages.
