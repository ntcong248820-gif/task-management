# Code Review: Phase 04 Frontend Architecture

## Scope
- Files: 10 implementation files + 1 plan
- LOC: ~600 total
- Focus: SWR refactoring, Zustand store, error boundary

## Overall Assessment

**Implementation is incomplete.** 2 of 5 hooks (`useDiagnosisData`, `useKeywordDetailData`) are stub implementations that do NOT use SWR. Type-check fails with 17 errors. The keywords detail page will crash at runtime because `useKeywordDetailData` returns `data: null` always.

---

## Critical Issues

### 1. `useDiagnosisData.ts` — NOT refactored to SWR (stub)

**File:** `apps/web/src/hooks/useDiagnosisData.ts`

```ts
// Current: returns hardcoded null/stub values
return {
    diagnosis: null,    // hardcoded null
    loading: false,      // hardcoded false
    error: null,         // hardcoded null
    fetchDiagnosis,      // only triggers SWR mutate, no initial data fetch
    clearDiagnosis,
};
```

**Impact:** This hook never fetches data. It imports `useSWR` and `fetcher` but never calls them. Type-check reports: `useSWR' is declared but its value is never read.`

**Fix required:** Add SWR `useSWR` call for diagnosis data with proper key based on projectId.

---

### 2. `useKeywordDetailData.ts` — NOT refactored to SWR (broken)

**File:** `apps/web/src/hooks/useKeywordDetailData.ts`

```ts
// Current: returns hardcoded null, no SWR usage
return {
    data: null,         // hardcoded null - will crash the detail page
    loading: false,
    error: null,
    fetchDetail,
};
```

**Impact:** CRITICAL. The keyword detail page (`apps/web/src/app/dashboard/keywords/[keyword]/page.tsx`) expects `data.summary`, `data.chartData`, `data.pages`. Since `data` is always `null`, the page will crash at runtime with `Cannot read properties of null`. Type errors:
```
src/app/dashboard/keywords/[keyword]/page.tsx(127,33): error TS2339: Property 'summary' does not exist on type 'never'.
```

---

### 3. Type-check fails (17 errors)

**Command:** `npm run type-check --workspace=apps/web`

- 13 errors in `keywords/[keyword]/page.tsx` — properties on `never` type
- 2 errors in `useDiagnosisData.ts` — unused imports
- 2 errors in `useKeywordDetailData.ts` — unused imports

**Recommendation:** Fix `useKeywordDetailData` and `useDiagnosisData` to properly use SWR and return typed data.

---

## High Priority

### 4. Inconsistent `mutate` import in SWR hooks

**Files:** `useRankingsData.ts:3`, `useURLsData.ts:3`, `useDiagnosisData.ts:3`, `useKeywordDetailData.ts:3`

```ts
import useSWR, { mutate } from 'swr';  // Global mutate
```

`useRankingsData` and `useURLsData` use the global `mutate(key)` which works but is less idiomatic than using the bound `mutate` from the specific `useSWR` call. Compare:

```ts
// Global mutate (works but less predictable)
await mutate(key);

// Bound mutate (better - tied to specific cache key)
await keywordsMutate(key);
```

Not blocking but inconsistent with `useAnalyticsData.ts:75-76` which correctly uses bound `mutate`.

---

### 5. Error boundary has no logging

**File:** `apps/web/src/components/error-boundary.tsx`

Error boundaries swallow errors silently in production. No `componentDidCatch` or `onError` callback for observability.

**Recommendation:** Add optional `onError` prop for error logging to observability tools.

---

## Medium Priority

### 6. `clearDetail` is a no-op

**Files:** `useURLsData.ts:123-125`, `useDiagnosisData.ts:46-48`

```ts
const clearDiagnosis = useCallback(() => {
    // SWR handles cache automatically
}, []);
```

SWR does NOT auto-clear detail data on navigation. If user views URL A then URL B, then goes back to URL A, SWR may serve stale cached data. Consider explicitly clearing via `mutate(key, null)` or using SWR's `cache` API.

---

### 7. Unused `selectedProjectId` in `dashboard/page.tsx`

**File:** `apps/web/src/app/dashboard/page.tsx:103`

The page extracts `selectedProjectId` but `useCorrelationData` (local hook at line 59) receives it correctly. No issue here, just noting it follows the pattern correctly.

---

## Positive Observations

1. **SWR caching pattern correct** — `useAnalyticsData`, `useRankingsData`, `useURLsData` all properly pass `null` key when `projectId` is null, preventing spurious fetches
2. **Zustand store** properly configured with `persist` middleware and `number | null` type
3. **Error boundary** correctly wraps dashboard layout
4. **`dashboard/page.tsx`** correctly uses `getApiUrl` instead of own `API_BASE` constant
5. **No `projectId = 1` defaults** — all hooks use `number | null`
6. **`useProjectStore`** is single source of truth for project selection

---

## Recommended Actions

1. **[Critical]** Implement `useKeywordDetailData` with actual SWR call:
   ```ts
   const key = projectId && keyword 
       ? getApiUrl(`/api/keywords/detail?projectId=${projectId}&keyword=${encodeURIComponent(keyword)}&days=30`)
       : null;
   const { data, error, isLoading, mutate } = useSWR(key, fetcher);
   ```

2. **[Critical]** Implement `useDiagnosisData` with actual SWR call for overview data

3. **[Critical]** Run type-check until 0 errors

4. **[High]** Add error boundary `onError` prop for production logging

5. **[Medium]** Consider adding `mutate(key, null)` to `clearDetail` functions for explicit cache clearing

---

## Metrics

- Type Check: 17 errors (2 stub hooks not using SWR)
- Lint Issues: Unknown (not run)
- SWR Adoption: 3/5 hooks properly implemented (60%)

---

## Unresolved Questions

1. Is there an API endpoint for `/api/diagnosis/url` that returns overview data, or does diagnosis only work per-URL?
2. What is the expected API response shape for `useKeywordDetailData` — does it match the `KeywordDetail` interface defined in the hook?
