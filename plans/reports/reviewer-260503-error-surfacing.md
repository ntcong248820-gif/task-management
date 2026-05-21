# Code Review: Phase 03 Error Surfacing — GSC/GA4 Sync Jobs

**Reviewer:** code-reviewer
**Date:** 2026-05-03
**Scope:** `sync-gsc.ts`, `sync-ga4.ts`, `sync-gsc.ts` cron route, `sync-ga4.ts` cron route

---

## Overall Assessment

Implementation is mostly sound. Error tracking, `lastSyncedAt` update logic, and result shape are consistent across both files. The cron route responses are correct. Two real issues warrant fixes before merge.

---

## Critical Issues

### 1. Silent outer try/catch吞掉 top-level errors

Both job files have an identical pattern at the bottom of `runXxxSync()`:

```ts
} catch (error: any) {
    log.error('Error in GSC sync job:', error);
}

return result;
```

If `db.select()` on line 146 (GSC) or line 144 (GA4) throws — e.g., DB connection failure — the error is logged but **not added to `result.errors`**. The function returns `{ synced: 0, errors: [] }`, making a total failure look like a no-op to the caller. The cron route will then return `{ ok: true, synced: 0, errors: [] }` — a false positive.

**Fix:** Add the outer error to `result.errors`:

```ts
} catch (error: any) {
    log.error('Error in GSC sync job:', error);
    result.errors.push(`job: ${error.message}`);
}
```

This affects both `sync-gsc.ts:282-284` and `sync-ga4.ts:253-255`.

---

### 2. GSC route returns `error` key on failure, GA4 route returns `error` key on failure — both 500 — but the success shape includes `synced` + `errors` in both

This is actually **correct** — the routes properly propagate job-level errors. No issue here.

---

## High Priority

### 3. `lastSyncedAt` is only set when data exists, but `lastSyncedAt` is updated unconditionally after data insert

Both files update `lastSyncedAt` at lines 267-270 (GSC) and 238-241 (GA4). This happens **after** the batch upsert succeeds and **after** the aggregated data upsert (GSC only). The logic is:

1. Fetch data
2. Upsert data
3. Upsert aggregated (GSC)
4. Update `lastSyncedAt`

This is correct — `lastSyncedAt` only advances on successful data write. Verified.

---

### 4. Empty-data case does NOT update `lastSyncedAt` — correct

In both files, when `data.length === 0` (lines 184-187 GSC, 182-185 GA4), the code does `continue` without updating `lastSyncedAt`. This is correct because there was no new data to persist. **No issue.**

---

### 5. Error message format is consistent

Both files push errors in the format `project ${connection.projectId}: ${error.message}` — consistent. Verified.

---

## Low Priority

### 6. CronJob type wrapper is redundant but harmless

```ts
async () => { await runGSCSync(); }
```

`runGSCSync()` returns a `Promise<{ synced, errors }>` which is discarded. The wrapper doesn't change behavior. Could simplify to just `runGSCSync` but this is minor stylization, not a bug.

### 7. `token-refresh.ts` uses `console.log` instead of structured logger

Lines 40, 57, 67 in `token-refresh.ts` use raw `console.log`. While not part of the changed files, these are called during sync and will produce console output in production. Consider using the structured `logger` from `../utils/logger` instead. Outside scope of this review but worth noting.

---

## Edge Cases Found

| Scenario | Behavior | Expected | Pass? |
|---|---|---|---|
| DB down at start of job | `result.errors` stays `[]`, returns `{ ok: true }` | Should return `{ ok: false }` | **FAIL** |
| Single project fails mid-loop | Error added to `result.errors`, other projects continue | Correct partial success | PASS |
| `getValidAccessToken` throws | Error caught, added to `result.errors`, next project continues | Correct | PASS |
| No GSC/GA4 connections | `connections = []`, loop skipped, returns `{ synced: 0, errors: [] }` | Ambiguous but acceptable | Acceptable |
| All projects return 0 rows | Each gets error added, `synced` stays 0 | Correct | PASS |

---

## Recommended Actions

1. **[Critical]** Fix outer try/catch in `sync-gsc.ts:282-284` and `sync-ga4.ts:253-255` to push error to `result.errors` so job-level failures are surfaced.
2. No other changes required.

---

## Metrics

- Files reviewed: 4
- LOC reviewed: ~370
- Critical issues: 1
- High priority issues: 0
- Medium/low: 2 (stylization)

---

## Unresolved Questions

- Is an empty-sync (no connections) considered an error condition that should return `ok: false`? Current implementation returns `ok: true` with zero results. If this is intentional, ignore. If not, the outer try/catch fix in #1 would address it if you also treat `result.synced === 0 && result.errors.length === 0` as an error condition at the route level.