---
title: "Analytics Metrics Accuracy Fix (GSC + GA4)"
description: "Fix incorrect CTR/Position formulas, search type filter, multi-site aggregation, and GA4 user double-counting"
status: cancelled
priority: P1
effort: 5h
branch: main
tags: [analytics, gsc, ga4, bug-fix, accuracy]
created: 2026-05-09
---

## Goal
Align API analytics output with GSC dashboard and GA4 truth values. Eliminate
math errors (unweighted AVG), filter mismatches (search type), and silent
multi-site aggregation that mislead users.

## Phases

| # | Phase | Files | Effort | Status |
|---|-------|-------|--------|--------|
| 01 | Fix GSC metric calculations (C1, C2, H3, M2) | `analytics.ts` | 1.5h | pending |
| 02 | Fix GSC search type filter in cron (H1) | `sync-gsc.ts` | 0.5h | pending |
| 03 | Add ga4DataDaily table + sync + accurate users query (H2 Option B) | `db/schema`, `sync-ga4.ts`, `analytics.ts` | 2h | pending |
| 04 | Historical data cleanup + backfill (GSC type:web + GA4 daily users) | ops script | 1h | pending |

## Dependencies
- Phase 01 → independent, ship first (visible KPI fix)
- Phase 02 → independent of 01; cron change affects future syncs only
- Phase 03 → independent of 01 and 02; requires DB migration before Phase 04
- Phase 04 → blocked by Phase 02 (GSC backfill) and Phase 03 (GA4 table must exist)

## Cross-Phase Risks
- Phase 03 requires `db:push` (schema change) — coordinate deploy window
- Phase 04 backfills can run concurrently (GSC + GA4 are separate tables)
- Frontend: Phase 03 changes response field `totalUsers` → verify web client
- Cache: No CDN/edge cache on these endpoints

## Success Criteria
- CTR API value matches GSC dashboard within 0.5%
- Avg Position API matches GSC dashboard within 0.3
- GSC totals reflect single project site (not 3-site sum) by default
- KPI and chart pull from same table (`gscDataAggregated`)
- GA4 `users` metric sourced from `ga4DataDaily` (date-only dim, accurate)
- All historical `gscDataAggregated` rows regenerated with `type=web`
- `ga4DataDaily` backfilled for last 30 days

## Validation Method
1. Fetch `/api/analytics/gsc?projectId=1&startDate=2026-04-09&endDate=2026-05-06`
2. Open GSC dashboard, same site + date range, "Web" tab (= `type=web`)
3. Compare clicks, impressions, CTR, position — diffs within 0.5%/0.3 tolerance
4. Repeat for GA4: compare `users` from API vs GA4 dashboard (expect ±2% HLL++ variance)
5. Verify chart data and KPI use consistent source

## Rollback
- Phase 01-02: Single-file revert via `git revert`. No data change.
- Phase 03: Revert code; DB table can remain (empty, unused). Drop migration if needed.
- Phase 04: No rollback needed (backfill is additive upsert).
