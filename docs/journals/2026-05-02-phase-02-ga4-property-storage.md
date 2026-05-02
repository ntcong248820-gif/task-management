# Phase 02 — GA4 Property Storage Fix

**Date:** 2026-05-02
**Phase:** 02 of `260502-1643-gsc-ga4-data-sync-fix`
**Status:** COMPLETED

---

## Context

Dashboard showed zero data because:
1. `ga4_properties` table was empty (0 rows) — GA4 OAuth callback didn't save properties
2. `sync-ga4.ts` auto-discovery returned null when multiple properties found → silently skipped

## What Was Done

### 1. GA4 Callback (`packages/api-app/src/routes/integrations/ga4.ts`)

After OAuth token save, added property discovery + save via `accountSummaries.list()` API:

```typescript
// Discover and save GA4 properties after OAuth connect
try {
    const summaryResponse = await analyticsadmin.accountSummaries.list();
    const summaries = summaryResponse.data.accountSummaries || [];
    const allProperties = summaries.flatMap(a => a.propertySummaries || []);

    for (const prop of allProperties) {
        // Extract + dedupe + insert to ga4_properties
    }
} catch (propError) {
    log.error('Failed to discover/save GA4 properties:', propError);
}
```

Non-blocking: OAuth succeeds even if property discovery fails.

### 2. Sync GA4 (`packages/api-app/src/jobs/sync-ga4.ts`)

Updated `getOrDiscoverPropertyId()` to:
- Save ALL discovered properties to DB (user can select later via `/properties` endpoint)
- Return first property ID as default (instead of null when multiple found)
- Added `and` to imports

### 3. Code Review Fix

Reviewer noted inconsistent API between callback (`properties.list()`) vs sync-ga4 (`accountSummaries.list()`). Fixed callback to use `accountSummaries.list()` for consistency.

## Files Modified

- `packages/api-app/src/routes/integrations/ga4.ts` — callback property save
- `packages/api-app/src/jobs/sync-ga4.ts` — getOrDiscoverPropertyId() fix
- `plans/260502-1643-gsc-ga4-data-sync-fix/phase-02-*.md` — status updated

## Verification

- TypeScript: `npx tsc --noEmit` in api-app — zero errors
- Tests: 38 passed, 0 failed
- Code review: DONE_WITH_CONCERNS → Fixed

## Next Steps

- Phase 03: Error surfacing + `last_synced_at` updates
- Phase 04: Historical data backfill (run backfill script)
