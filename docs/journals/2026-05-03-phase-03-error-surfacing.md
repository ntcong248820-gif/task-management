# Phase 03: Error Surfacing + last_synced_at Fix

**Date**: 2026-05-03
**Severity**: Medium
**Component**: GSC/GA4 sync jobs
**Status**: Resolved

## What Happened

Completed Phase 03 of the GSC/GA4 data sync fix plan. Refactored sync functions to properly surface errors and fixed the `last_synced_at` timestamp update that was missing from the original implementation.

## The Brutal Truth

This was supposed to be a quick "return errors from sync functions" change. Ended up finding three distinct bugs across four files that together meant sync failures were completely invisible to the caller. The `last_synced_at` fix alone was embarrassing -- we had the code but it was in the wrong place, outside the per-project try block where it would never run on partial failures.

## Technical Details

**Return type change:**
```typescript
// Before: just returned void or number
// After: returns {synced: number, errors: string[]}
const result = await runGSCSync(projectId);
```

**last_synced_at placement fix:**
```typescript
// WRONG (was outside try block):
try {
  // sync logic
} catch (e) {
  // error handling
}
lastSyncedAt = new Date(); // This ran even on failure!

// CORRECT (inside try block after data insert):
try {
  // sync logic
  // data insert
  await tx.update(projects).set({ lastSyncedAt: new Date() });
} catch (e) {
  // error handling
}
```

**CronJob type mismatch:**
```typescript
// onTick returns Promise<void> but CronJob expected sync function
// Needed async wrapper:
const job = new CronJob(cronExpr, async () => {
  await runGSCSync(projectId);
});
```

**Result shape from cron handlers:**
```json
{
  "ok": true,
  "durationMs": 4521,
  "synced": 3,
  "errors": []
}
```

## What We Tried

1. Returned `{synced, errors}` tuple from sync functions -- first attempt had errors leaking at wrong scope
2. Moved `last_synced_at` update into the per-project try block -- reviewer caught this on code review
3. Added outer try/catch in cron handlers to capture job-level errors -- originally missing entirely

## Root Cause Analysis

Two separate issues:

1. **Error swallowing**: The original `runGSCSync`/`runGA4Sync` functions logged errors but did not return them. Callers had no way to know something failed beyond the console log.

2. **last_synced_at timing**: The timestamp was updated after the try/catch block instead of inside it after successful data insertion. This meant projects showed "synced" even when the sync actually failed.

3. **CronJob generic mismatch**: TypeScript accepted `onTick: (async) => Promise<void>` as `() => void` due to function arity mismatch, causing the job to fire but never actually wait for the async work.

## Lessons Learned

- **Return values matter**: Sync functions that only log errors and return void are nearly useless for monitoring. Always return structured results.
- **Scope of try/catch matters**: Putting `last_synced_at` outside the try block was a clear think-o that review caught.
- **Type safety for third-party libs**: CronJob's `onTick` type signature is loose. An async function satisfies it but doesn't block properly.

## Next Steps

- Phase 04: Historical backfill implementation (pending)
- Monitor production sync success rates via the new `errors` array in cron responses
- Consider adding alerting if `errors.length > 0` on consecutive syncs