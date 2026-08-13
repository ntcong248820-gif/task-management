---
title: "Phase 2: Data Provenance Schema for GSC/GA4"
date: 2026-08-13
summary: "Added nullable site_url/property_id provenance columns to gsc_data/ga4_data, updated unique indexes and all 4 sync writers, migrated production data safely"
---

# Phase 2: Data Provenance Schema for GSC/GA4

## What happened

Implemented Phase 2 of the SEO Impact OS data-trust roadmap: source provenance
for raw analytics fact tables. Goal was to let multiple GSC sites / GA4
properties write rows for the same project/date without unique-index
collisions, and to lay groundwork for excluding legacy unprovenanced rows
from reporting in a later phase.

Changes:
- `gsc_data.site_url` (nullable varchar) and `ga4_data.property_id` (nullable
  varchar) added via hand-written migration `0008_analytics_source_provenance.sql`.
- Unique indexes replaced (`gsc_data_unique_v2_idx`, `ga4_data_unique_v2_idx`)
  to include the new source dimension.
- All 4 writers updated: GSC cron job, GSC manual sync route, GA4 cron job,
  GA4 manual sync route — each now inserts the provenance column and includes
  it in the `onConflictDoUpdate` target array.
- 6 new tests in `apps/api/src/__tests__/analytics-provenance.test.ts`.

## Decision

Migration applied directly to production (gsc_data ~944K rows, ga4_data
~2.1K rows) after explicit user authorization, since the change is
additive-only (nullable columns, no drops, no NOT NULL). No dev branch or
safe-copy dry-run was available in this environment (Supabase MCP connects
directly to production, no branches provisioned), so validation instead came
from: applying the same migration to a local fallback Postgres DB and running
real tests against it, plus reviewing the SQL for any non-additive operation.

Code review surfaced one gap: Postgres unique indexes treat NULL as distinct
from NULL, so legacy rows with identical keys and NULL provenance are not
deduped by the new index. Rather than implement the plan's original
partial-index mitigation, decided to document this as a known, deferred gap
with an explicit regression test proving the behavior — legacy rows are
already excluded from user-facing reporting in a later phase, so dedup
wasn't required for Phase 2's acceptance criteria.

## Next steps

- Phase 3 (Sync Health & Source Management) is next in the roadmap.
- Two follow-up items noted but not ticketed: (1) legacy NULL-provenance row
  cleanup after a fresh sync, (2) pre-existing schema-vs-migration drift on
  two gsc_data indexes declared in Drizzle schema but never migrated (found
  during this phase, confirmed unrelated via git history).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
