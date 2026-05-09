# GSC Cron Silently Failing Due to API Data Delay

**Date**: 2026-05-09 09:15
**Severity**: High
**Component**: GSC sync job, cron scheduling
**Status**: Resolved

## What Happened

User reported zero data on dashboard charts despite GitHub Actions cron showing successful runs. Investigation revealed the cron was completing with `synced: 0` on every execution — a silent failure that looked like success.

Database state at time of discovery:
- `ga4_data`: 2,381 rows (2026-05-02 to 2026-05-07) ✅
- `gsc_data`: 41,000 rows (only 2026-05-03) ⚠️
- `gsc_data_aggregated`: 0 rows ❌
- GSC token `last_synced_at`: NULL ❌

GA4 token `last_synced_at` was current (2026-05-08), so GA4 sync was working fine.

## The Brutal Truth

This is infuriating because the cron appeared to be working. Every run showed `ok: true` with no errors in the summary view. But the actual GitHub Actions log revealed the truth: `"errors":["project 1: no data for 2026-05-07"]`. The cron was dutifully syncing yesterday's data, finding nothing, and marking success. Meanwhile, the dashboard remained broken and there was no signal that anything was wrong. Silent failures are the worst kind of failure.

## Technical Details

GitHub Actions run 25576878629 (2026-05-08 11:30 UTC):
```json
{
  "ok": true,
  "durationMs": 3965,
  "synced": 0,
  "errors": ["project 1: no data for 2026-05-07"]
}
```

Root cause: `packages/api-app/src/jobs/sync-gsc.ts` was syncing `date - 1` (yesterday). GSC API has a **2-3 day data availability lag** — data for yesterday doesn't exist yet. GA4 API only has ~24h lag, so GA4 sync was fine. This mismatch meant GSC was always requesting unavailable data, never updating `last_synced_at`, and aggregated metrics never materialized.

## What We Tried

1. Checked OAuth token validity — token was valid
2. Verified database connectivity — all working
3. Inspected cron logs in GitHub Actions — found the "no data for 2026-05-07" error
4. Realized the API delay discrepancy between GSC and GA4

## Root Cause Analysis

The implementation assumed GSC and GA4 API data availability was identical (24h lag). In reality, GSC requires 2-3 days for data to be available. By syncing `yesterday`, the cron was always chasing data that didn't exist yet, causing `synced: 0` on every run. The status response made it look successful because there were no HTTP errors — just an empty dataset.

This gap wasn't caught during development because:
- No test coverage for the cron job itself
- No error monitoring/alerting on `synced: 0` with non-zero errors
- Assumption that both APIs had similar data delays wasn't validated

## Lessons Learned

1. **Silent failures are deadly**: A cron that returns `ok: true` while doing nothing is worse than a cron that fails loudly. Add explicit alerts for `synced: 0` when errors array is non-empty.

2. **API delays vary wildly**: Never assume parity between third-party APIs. GSC and GA4 have different data freshness guarantees. Document these explicitly.

3. **Cron observability is critical**: The current response format doesn't surface actual sync results. Need structured logging that captures: dates requested, rows found, rows written, and any API-level errors separately from HTTP errors.

4. **Test external integrations**: Cron jobs need integration tests or at minimum dry-run modes that verify data is actually available before syncing.

## Next Steps

**Completed (2026-05-09)**:
- Changed sync window from `date - 1` to `date - 3` to account for GSC data lag
- Committed: `fix(gsc): sync 3 days ago instead of yesterday to account for GSC API data delay`
- Pushed to main; Vercel auto-deployed

**Pending**:
- Phase 04 historical backfill: User needs to manually POST `/api/integrations/gsc/sync` with `days: 30` to populate 2026-04-09 through 2026-05-08
- Add error monitoring: Alert on `synced: 0` when errors array contains data-not-available errors
- Document API data delay assumptions in codebase comments
- Consider adding a "last attempt" timestamp separate from `last_synced_at` to distinguish "we tried but no data" from "we haven't tried yet"

**Owner**: Follow up on cron observability after Phase 04 completes.
