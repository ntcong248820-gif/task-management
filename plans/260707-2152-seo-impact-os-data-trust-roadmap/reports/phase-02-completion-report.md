# Phase 2 Completion Report — Data Provenance Schema

Date: 2026-08-13
Plan: `plans/260707-2152-seo-impact-os-data-trust-roadmap/`
Phase: 2 of 7 — Data Provenance Schema
Status: **Completed**

## What shipped

Nullable source-provenance columns on the two raw analytics fact tables, so multiple GSC sites / GA4 properties can each write rows for the same project/date without unique-index collisions, and so future phases (4+) can filter out legacy unprovenanced rows.

| File | Change |
|---|---|
| `packages/db/src/schema/gsc_data.ts` | Added nullable `siteUrl` (varchar 500). Replaced `gsc_data_unique_idx` with `gsc_data_unique_v2_idx` (adds `siteUrl` to composite key). |
| `packages/db/src/schema/ga4_data.ts` | Added nullable `propertyId` (varchar 100). Replaced `ga4_data_unique_idx` with `ga4_data_unique_v2_idx` (adds `propertyId` to composite key). |
| `packages/db/migrations/0008_analytics_source_provenance.sql` | New hand-written migration: `ADD COLUMN IF NOT EXISTS` (both nullable), drop old unique indexes, create new ones. No `DROP COLUMN`, `NOT NULL`, `DELETE`, or `TRUNCATE` — additive only. |
| `packages/api-app/src/jobs/sync-gsc.ts`, `routes/integrations/gsc.ts` | Cron + manual sync writers now insert `siteUrl` and include it in the `onConflictDoUpdate` target. |
| `packages/api-app/src/jobs/sync-ga4.ts`, `routes/integrations/ga4.ts` | Cron + manual sync writers now insert `propertyId` and include it in the `onConflictDoUpdate` target. |
| `apps/api/src/__tests__/analytics-provenance.test.ts` | New file, 6 tests (see below). |

## Migration deployment

Applied directly to production Supabase (`gsc_data` ~944K rows, `ga4_data` ~2.1K rows) via `apply_migration`, with explicit user authorization obtained beforehand (nullable/additive → low risk, no downtime). Also applied locally (`postgresql://kong.peterpan@localhost:5432/seo_impact_os`, via `drizzle-kit migrate`) to independently validate the SQL is correct — idempotent, columns nullable, new indexes present with correct columns.

## Verification

- `apps/api/src/__tests__/analytics-provenance.test.ts` — 6/6 passing:
  1. Two different GSC `siteUrl` sources, same project/date/page/query — no collision.
  2. Two different GA4 `propertyId` sources, same project/date/dimensions — no collision.
  3. Duplicate row for same `siteUrl` still rejected by unique index.
  4. Legacy `NULL`-provenance rows excluded from provenance-scoped queries, included in `NULL`-scoped queries.
  5. **Known-gap regression test** (added after code review): two otherwise-identical rows with `siteUrl`/`propertyId` both `NULL` are NOT rejected — Postgres unique indexes treat `NULL <> NULL`. Documents that legacy-row dedup is not handled by this index; deferred, see Known gaps below.
  6. Sync-writer-style inserts (matching `sync-gsc.ts`/`sync-ga4.ts` shape) never produce a `NULL` provenance column when a value is supplied.
- Full `apps/api` suite: 34/34 passing, zero regressions (5 files including the new one).
- `npm run type-check`: clean, all 8 packages.
- `npm run lint`: clean.
- Grepped every consumer of `gscData`/`ga4Data` (`analytics.ts`, `correlation.ts`, `diagnosis.ts`, `keywords.ts`, `rankings.ts`, `urls.ts`, `alert-engine.ts`, `weekly-digest.ts`, `useAnalyticsData.ts`) — none reference the new columns, none broken.
- Independent `code-reviewer` subagent pass: no critical/high findings. One medium finding (missing NULL-NULL test coverage) — closed by adding test #5 above.

## Known gaps (intentionally deferred, not blocking Phase 2)

1. **Legacy `NULL`-provenance duplicate rows are not deduped.** Postgres unique indexes don't enforce `NULL = NULL`, so pre-migration rows with identical keys and `NULL` `siteUrl`/`propertyId` can coexist. This was flagged in the original plan's Architecture section (partial-index mitigation) but not implemented — relying on native Drizzle-expressible unique index instead. Acceptable because legacy rows are already excluded from user-facing reporting (that exclusion is Phase 4 work). Revisit if/when a legacy-row cleanup pass is scheduled.
2. **No cleanup path for stale `NULL`-provenance rows after a fresh sync.** Plan mentioned this as a possible follow-up; no ticket exists yet. Not required for Phase 2's acceptance criteria.
3. **Pre-existing schema drift, unrelated to this phase**: `gsc_data.ts` declares `gsc_data_project_query_date_idx` / `gsc_data_project_page_date_idx` indexes with no corresponding migration ever creating them in the DB (confirmed via git history predates Phase 2). Left untouched — out of scope, but worth a follow-up ticket since it means `drizzle-kit push` vs `generate` workflows could silently diverge across environments.

## Plan sync-back

- `phase-02-data-provenance-schema.md`: status → `completed`, Todo List and Success Criteria checkboxes updated to reflect actual verified state (2 items explicitly marked deferred/out-of-scope with reasoning, not silently checked off).
- `plan.md`: Phase 2 row → "Completed (2026-08-13)", frontmatter `status` → `in-progress` (Phase 1 previously `pass_with_concerns`, Phase 2 now done, Phases 3–7 still pending).

## Unresolved questions

- None blocking. Two low-priority follow-ups noted above (legacy-row cleanup ticket, schema-drift ticket) are candidates for a future phase or a standalone chore, not required before Phase 3.
