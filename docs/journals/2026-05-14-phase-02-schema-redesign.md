---
date: 2026-05-14
type: implementation-journal
plan: plans/260510-1600-v2-greenfield-rebuild/
phase: 02-schema-redesign
status: implemented
---

# Journal: Phase 02 Schema Redesign

## Context

Completed Phase 02 of the v2 greenfield rebuild. This phase replaced the old business schema with a workspace-scoped UUID model, while keeping analytics tables project-scoped only.

## What Happened

- Redefined business entities around UUID primary keys and Better Auth workspace IDs (`workspaceId` as text from `organization.id`).
- Replaced `oauth_tokens`, `gsc_sites`, and `ga4_properties` with `gsc_connections` and `ga4_connections`.
- Added `goals`, `sprints`, `task_templates`, `alerts`, and `alert_reads`.
- Kept `gsc_data`, `gsc_data_aggregated`, and `ga4_data` on `projectId` only, with workspace resolved through joins.
- Updated API routes, jobs, shared types, and web code to use string UUID IDs and workspace scope.
- Backed up the local DB to `/tmp/seo-impact-os-phase02-20260514-084302/seo_impact_os_before_phase02.sql`.
- Removed stale `packages/db/src` JS schema artifacts, then applied local Drizzle push successfully.
- Closed code-review blockers: project ownership checks for analytics/read routes, OAuth project validation, task goal/sprint workspace checks, connection-specific cron sync, safe test cleanup, and removal of stale `apps/api` duplicate code.

## The Brutal Truth

This was the cleanest way to stop the old schema from leaking phase-01 assumptions everywhere, but it also meant touching a lot of surface area at once. The annoying part now is not the local work, it is the stale remote env: the default DB still points at `jtdeuxvwcwtqzjndhrlg`, and that tenant is dead enough to fail with `tenant/user not found`.

## Technical Details

- UUID business schema, text `workspaceId`, project-only analytics tables.
- New connection tables replaced the old token/site/property split.
- Local validation passed:
  - `npm run type-check`
  - `npx turbo run test --force` -> `44/44`
  - `npm run lint` -> no warnings/errors
  - `npm run build` with local placeholder env
- Build still prints the Node warning about `--localstorage-file` without a valid path.

## What We Tried

- Backed up the live local database before the schema reset.
- Removed stale generated JS schema artifacts from `packages/db/src`.
- Applied the new schema locally with Drizzle instead of pretending the migration was fine.
- Let code review punch holes in the first pass, then fixed workspace isolation before commit.
- Ran the full local validation stack after the redesign.

## Root Cause Analysis

The old schema was built around single-user / project-centric assumptions. That design could not survive the move to workspace-scoped auth plus multi-user sharing, so the redesign had to reset the business layer instead of trying to patch it.

## Lessons Learned

- If workspace ownership is the real boundary, encode it in schema early and do not fake it with token tables.
- Analytics fact tables stay lean; workspace scope belongs in the project layer, not every row.
- If analytics tables do not carry `workspaceId`, every read route must prove project ownership before querying.
- Generated artifacts must be cleaned when schema shape changes, or they become stale liability.

## Next Steps

- Update the default DB env before any remote schema push.
- Re-run the schema push against the intended Supabase project.
- Keep Phase 03 aligned to the new UUID and workspace model.

## Unresolved Questions

- Which DB env file is still pinned to `jtdeuxvwcwtqzjndhrlg`, and who owns that update?
