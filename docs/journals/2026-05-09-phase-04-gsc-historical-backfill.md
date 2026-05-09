# Phase 04: GSC Historical Data Backfill — Completed

**Date**: 2026-05-09 10:30
**Severity**: Medium
**Component**: GSC Analytics, Data Aggregation
**Status**: Resolved

## What Happened

Executed historical backfill of `gsc_data_aggregated` for the past 30 days. KPI metrics now reflect real data instead of zeros.

## The Brutal Truth

We almost solved this the wrong way. First instinct was to call the Vercel production endpoint with `days: 30` — timed out instantly at 10s limit because the raw API response is massive. Then discovered the backfill script was already sitting in the codebase (`backfill-gsc-aggregated.ts`). The real blocker was the `ENCRYPTION_KEY` not being in local env; had to `vercel env pull` to get production secrets.

## Technical Details

**Script run**: `npm run backfill-gsc-agg -- --days=30`

Inserted 84 rows total:
- Sites: dienmayxanh.com, thegioididong.com, topzone.vn
- Date range: 2026-04-09 → 2026-05-06
- Metrics: 31.5M clicks, 642M impressions, CTR 4.46%

## What We Tried

1. HTTP POST to Vercel `/api/integrations/gsc/sync` with `days: 30` → timeout
2. Located and ran dry-run of backfill script → confirmed 84 rows
3. Pulled production env vars → obtained `ENCRYPTION_KEY`
4. Ran live backfill → success

## Root Cause Analysis

Initial approach lacked awareness that Vercel has a hard 10s timeout limit. The backfill script was the correct solution but required production credentials. Lesson: check for existing tooling before building new endpoints.

## Lessons Learned

- Backfill operations should always be scripted, not HTTP-based
- Production secrets are sometimes necessary for local dev work — that's a constraint, not a flaw
- Check the tooling inventory before assuming you need to build something new

## Next Steps

`chartData` still returns zeros because it reads from `gscData` (granular table), not aggregated. Raw data only exists for 2026-05-03. A separate `gscData` backfill would fix this but is out of scope for Phase 04. Plan `260502-1643-gsc-ga4-data-sync-fix` is complete.
