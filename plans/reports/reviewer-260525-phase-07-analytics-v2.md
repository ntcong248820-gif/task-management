# Code Review — Phase 07 Analytics Dashboards v2

**Date:** 2026-05-25
**Reviewer:** code-reviewer

---

## Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | requireProjectInWorkspace on all new endpoints | PASS — all 5 new analytics + 3 correlation endpoints call it |
| 2 | Dynamic ORDER BY uses whitelist | PASS — validSorts dict + binary sortDir guard; sql.raw is safe |
| 3 | Legacy endpoints preserved | PASS — `/`, `/gsc`, `/ga4`, `/sites/:projectId` all present |
| 4 | Decay thresholds ≤-40→decaying, ≤-15→declining | PASS — analytics.ts:516-518 |
| 5 | Correlation tasks filtered to affectsWebsite=true | PASS — correlation.ts:81 and :212 |
| 6 | Impact window: prior period = equal-length before `from` | PASS — correlation.ts:169-171 |
| 7 | Sparklines use pure SVG | PASS — sparkline.tsx is 51-line SVG polyline, no Recharts |
| 8 | ga4Source=organic → source='google' AND medium='organic' | PASS — analytics.ts:127-129 |
| 9 | Pages use useProjectStore + useWorkspaceStore | PASS — all 3 analytics pages verified |
| 10 | Type-check passes | PASS (per plan) |

---

## Issues

### HIGH — keywords sort=change returns 500

**File:** `packages/api-app/src/routes/analytics.ts:291,320`

`validSorts` maps `sort=change` to the alias `'pos_change'`, but the SQL SELECT has no such column. `ORDER BY pos_change` will throw a Postgres `column "pos_change" does not exist` error. The keywords table UI exposes `positionChange` as a sortable column (`keywords-table.tsx:71`), so a user clicking `Δ Pos` header triggers this failure immediately.

**Fix:** Add the computed alias to the SELECT:

```sql
-- add to SELECT list in the keywords query (line ~309):
(AVG(position) FILTER (WHERE date >= prevStart AND date <= prevEnd)
 - AVG(position) FILTER (WHERE date >= start AND date <= end))::text AS pos_change,
```

Or alternatively map `'change'` to an expression string and keep `sql.raw` gated by the whitelist check. The simplest fix is to include the column in the SELECT.

---

### HIGH — ga4PrevConditions missing ILIKE filter for non-organic sources

**File:** `packages/api-app/src/routes/analytics.ts:205-217`

When `ga4Source` is `'direct'`, `'social'`, or `'referral'`, the current period GA4 query applies `source ILIKE '%direct%'` (line 131), but the prior period `ga4PrevConditions` block only handles the `organic` branch (line 210) and has no `else` clause for the ILIKE case.

Result: current period is source-filtered, prior period is unfiltered (all sessions). The cross-source `ga4Growth` delta compares apples to oranges — it will always show a large discrepancy and trigger the warning badge incorrectly.

**Fix:** Mirror the ILIKE branch in `ga4PrevConditions`:

```typescript
if (ga4Source === 'organic') {
    ga4PrevConditions.push(eq(ga4Data.source, 'google'));
    ga4PrevConditions.push(eq(ga4Data.medium, 'organic'));
} else if (ga4Source && ga4Source !== 'all') {
    ga4PrevConditions.push(sql`${ga4Data.source} ILIKE ${'%' + ga4Source + '%'}`);
}
```

---

## Concerns

### MEDIUM — ImpactWindowPicker state de-syncs after annotation click or Focus button

**File:** `apps/web/src/components/features/analytics/impact-window-picker.tsx:59-60`

`localFrom`/`localTo` are initialised from props once with `useState(from)`. When the user clicks an annotation line (`handleAnnotationClick`) or a task's Focus button (`onFocusTask`), the parent updates `impactFrom`/`impactTo`, the `ImpactSummaryPanel` and the `ReferenceArea` highlight both update — but the picker's calendar buttons still show the old dates. A user who then clicks Apply will submit the stale picker values, overwriting the annotation-triggered window.

**Fix:** Add a `useEffect` to sync local state when the controlled prop changes:

```typescript
useEffect(() => {
  setLocalFrom(from);
  setLocalTo(to);
}, [from, to]);
```

---

### MEDIUM — No server-side date validation on /api/correlation/impact-window

**File:** `packages/api-app/src/routes/correlation.ts:165-173`

`from`/`to` are passed directly to `new Date()` with no format check. An invalid date string produces `NaN`, which propagates through the date arithmetic and generates `NaN-NaN-NaN` SQL date strings. Postgres rejects these and the catch block returns a 500. A `from > to` date (bypassing the UI guard) produces a negative `rangeDays`, making the "prior period" actually a future window.

This is mitigated at the UI layer (`canApply` check in `ImpactWindowPicker`), but there is no defence-in-depth at the server boundary.

**Suggested fix:**

```typescript
const fromDate = new Date(from);
const toDate = new Date(to);
if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return c.json({ success: false, error: 'Invalid date format' }, 400);
}
if (fromDate > toDate) {
    return c.json({ success: false, error: 'from must be before to' }, 400);
}
```

---

## Low-priority observations

- **TrafficTrendChart receives `taskAnnotations={[]}`** (page.tsx:99). The component fully supports annotations but they are intentionally not wired on the overview — the correlation chart below handles them. No bug, but worth a comment to future readers.
- **Pages `validSorts` is narrower than keywords**: missing `ctr` and `change` entries. The pages response includes both fields. Not currently exposed in the table UI, but if sort columns are added later the backend silently falls through to `'cur_clicks'` default rather than erroring. Worth aligning.
- **`ImpactWindowData.tasks` is typed inline** rather than reusing the exported `TaskAnnotation` interface. Structurally identical, no runtime impact, but creates a silent divergence risk if one is updated without the other.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Implementation is solid across auth, SQL injection protection, sparkline performance, and most acceptance criteria. Two HIGH bugs will manifest immediately in production: `sort=change` on the keywords table returns 500, and `ga4Source=direct/social/referral` produces a false discrepancy warning in the cross-source card.
**Issues:**
1. (HIGH) `/api/analytics/keywords?sort=change` → 500: `pos_change` alias missing from SELECT
2. (HIGH) `ga4PrevConditions` missing ILIKE branch for non-organic sources → inflated cross-source delta
**Concerns:**
3. (MEDIUM) `ImpactWindowPicker` local state de-syncs when parent updates via annotation click or Focus button
4. (MEDIUM) No server-side date validation on `/api/correlation/impact-window`
