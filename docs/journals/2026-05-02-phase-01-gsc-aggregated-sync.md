# Phase 01 GSC Aggregated Sync Fix

**Date**: 2026-05-02 17:32
**Severity**: High
**Component**: GSC data sync / Analytics dashboard
**Status**: Resolved

## What Happened

The analytics dashboard was showing zero data despite GSC sync appearing to run successfully. After digging into the data flow, we discovered the sync was writing to `gsc_data` but the analytics API reads from `gsc_data_aggregated`. The aggregated table was never being populated.

Additionally, the site selection logic in `getOrDiscoverSiteUrl()` was selecting sites alphabetically rather than matching against `project.domain`. When multiple sites existed under a property (e.g., dienmayxanh.com and subdomains), it would pick dienmayxanh.com first regardless of which domain the project actually owned.

## The Brutal Truth

This is a textbook case of assuming interfaces haven't changed. Someone refactored the analytics API to read from `gsc_data_aggregated` but the sync job was never updated. The dashboard sat at zero for who knows how long while everyone assumed the sync was broken. It was not broken - it was writing to the wrong table entirely.

The site selection bug is equally frustrating. We had projects with different domains but only one GSC property, and the sync was grabbing the wrong site URL because it just picked the first alphabetically.

## Technical Details

**Files modified:**
- `apps/api/src/cron/sync-gsc.ts` - Added `gscDataAggregated` insert after `gsc_data` insert in `runGSCSync()`, replaced `getOrDiscoverSiteUrl()` with direct `project.domain` matching
- `apps/api/src/routes/integrations/gsc.ts` - Added `gscDataAggregated` insert after `gsc_data` insert in `/sync` endpoint

**Validation:**
- 38 tests passing
- Type-check passing
- Code review passed

## Root Cause Analysis

1. **Missing aggregated data writes**: The sync functions wrote to `gsc_data` but not `gsc_data_aggregated`. The analytics queries expect aggregated data.
2. **Incorrect site selection**: `getOrDiscoverSiteUrl()` selected sites by alphabetical order instead of matching `project.domain`. This caused wrong site data to be associated with projects.

## Lessons Learned

- When adding new tables, update ALL writers - not just the primary table
- Site selection must be deterministic based on domain matching, not arbitrary ordering
- Dashboard showing zero should trigger immediate checks on both "is data being written" AND "is data being written to the right table"

## Next Steps

- Monitor dashboard after next sync cycle to confirm data flows through
- Consider adding a validation check that `gsc_data_aggregated` row count > 0 after sync
- Phase 02: Implement proper delta sync to avoid re-processing historical data