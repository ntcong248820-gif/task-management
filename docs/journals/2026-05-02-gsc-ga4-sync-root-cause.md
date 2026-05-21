# GSC/GA4 Dashboard All-Zero: Root Cause Analysis

**Date:** 2026-05-02 17:02
**Severity:** Critical
**Component:** Data Sync Pipeline (GSC + GA4)
**Status:** DONE (root cause identified, plan written)

## What Happened

The GSC/GA4 dashboard has been showing all zeros for an unknown duration despite GitHub Actions cron running daily at 3AM and reporting "success." The cron job exit code was 0, Vercel log showed `ok:true`, but the analytics API reads from tables that cron never touches.

Three independent bugs conspire to produce zero data:
1. GSC writes to wrong table (raw vs aggregated)
2. GA4 never stores property ID at OAuth time
3. GSC picks wrong site from `gsc_sites` table

All three bugs share one trait: they swallow errors and return success anyway.

## Technical Details

### CRITICAL — GSC Table Mismatch

`sync-gsc.ts` writes exclusively to `gsc_data` (5-dimension: date+page+query+country+device). Analytics API (`analytics.ts:59,71,148`) reads exclusively from `gsc_data_aggregated` (date-only). Nothing in the cron path ever writes to `gsc_data_aggregated` — only a manual backfill script does.

```sql
-- DB confirmed empty
gsc_data = 0 rows
gsc_data_aggregated = 0 rows
```

### CRITICAL — GA4 Property Never Saved

OAuth callback (`ga4.ts` `/callback`) stores tokens via `upsertOauthTokens()` but never inserts into `ga4_properties`. At cron time, `sync-ga4.ts:getOrDiscoverPropertyId()` calls GA4 Admin API, finds multiple properties (TGDD + dienmayxanh + topzone), hits "multiple → return null" branch, logs warning, skips silently.

```sql
-- DB confirmed empty
ga4_properties = 0 rows
ga4_data = 0 rows
oauth_tokens.last_synced_at = NULL
```

### MEDIUM — GSC Wrong Site Selected

`gsc_sites` has 3 rows for project_id=1:
- id=1: dienmayxanh.com
- id=2: thegioididong.com (actual project target)
- id=3: topzone.vn

`getOrDiscoverSiteUrl()` does `LIMIT 1` without ORDER BY → returns `dienmayxanh.com` (first row), not `thegioididong.com`. Even if data were written, it would be for wrong site.

### LOW — Silent Error Masking

Both sync jobs catch per-connection errors, log, `continue`. Outer route handler returns `{ok:true}` regardless. `last_synced_at` remains NULL confirming no successful sync ever ran.

## What We Tried

1. Inspected GitHub Actions cron workflow — exit code 0, logs show `ok:true` from route handler
2. Ran psql against production DB — all data tables empty, `last_synced_at` NULL
3. Read `sync-gsc.ts` and `sync-ga4.ts` cron scripts — traced write path to `gsc_data` only
4. Read `analytics.ts` analytics API — traced read path to `gsc_data_aggregated` only
5. Read `ga4.ts` OAuth callback — found no `ga4_properties` insert
6. Read `gsc-sites.ts` site selection — found `LIMIT 1` with no ORDER BY or domain filter
7. Created fix plan at `plans/260502-1643-gsc-ga4-data-sync-fix/`

## Root Cause Analysis

**Primary:** GSC cron writes to `gsc_data`, analytics reads from `gsc_data_aggregated` — completely disconnected tables. No sync job touches aggregated table. This is a design bug: someone wrote the sync to raw table but analytics was built to query aggregated table.

**Primary:** GA4 OAuth callback stores tokens but never discovers/saves property ID. Sync has to re-discover every run, hits multiple-property edge case, returns null silently.

**Secondary:** GSC site selection uses arbitrary first-row instead of project-matched domain. Wrong site would yield wrong data even if tables matched.

**Tertiary:** Error masking throughout — per-connection try/catch swallows failures, route returns `ok:true` regardless, no `last_synced_at` update on success.

## Next Steps

- [ ] Phase 01: Fix GSC aggregated sync (write to `gsc_data_aggregated`) + site selection (ORDER BY domain match)
- [ ] Phase 02: Fix GA4 OAuth callback to save `ga4_properties` + handle multi-property edge case
- [ ] Phase 03: Error surfacing (throw instead of continue, update `last_synced_at`)
- [ ] Phase 04: Historical data backfill via manual sync API
- Owner: implementation per plan phases