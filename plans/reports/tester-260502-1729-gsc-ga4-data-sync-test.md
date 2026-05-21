# Test Report: Phase 01 GSC/GA4 Data Sync Fix

**Date:** 2026-05-02
**Scope:** api-app package (sync-gsc.ts, gsc.ts)

## Test Results Overview

| Package | Status | Tests | Passed | Failed | Skipped |
|---------|--------|-------|--------|--------|---------|
| @seo-impact-os/api | PASS | 28 | 28 | 0 | 0 |
| @seo-impact-os/web | PASS | 10 | 10 | 0 | 0 |
| **Total** | | **38** | **38** | **0** | **0** |

## Type Check

- **api-app package:** PASS (no errors)
- **Full project type-check:** Pre-existing path alias errors in apps/web (unrelated to changes)

## Changes Analyzed

### Modified Files
1. `packages/api-app/src/jobs/sync-gsc.ts`
   - Added `gscDataAggregated` + `projects` imports
   - Added domain-aware `getOrDiscoverSiteUrl()` (matches project.domain when multiple sites)
   - Added `gsc_data_aggregated` insert after `gsc_data` insert in `runGSCSync()`

2. `packages/api-app/src/routes/integrations/gsc.ts`
   - Added `gscDataAggregated` import
   - Added aggregated insert after `gsc_data` insert in `/sync` endpoint

## Coverage Gaps

- **No dedicated tests for sync-gsc.ts or gsc.ts routes** — these files handle GSC OAuth and cron sync, but have no unit tests
- Changes add `gscDataAggregated` table inserts alongside existing `gscData` inserts
- Manual sync endpoint (`/sync`) now inserts to both tables

## Critical Issues

None.

## Unresolved Questions

1. Are there integration tests that verify the aggregated data is correctly consumed by analytics queries?
2. Is the `projects` table imported correctly — should it be from `@repo/db` or `@repo/types`?
