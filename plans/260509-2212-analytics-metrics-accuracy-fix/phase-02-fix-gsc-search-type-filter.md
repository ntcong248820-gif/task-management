# Phase 02 — Fix GSC Search Type Filter in Cron

**Priority:** P1 (High) | **Status:** pending | **Effort:** 0.5h

## Overview
GSC sync cron's aggregated fetch (`packages/api-app/src/jobs/sync-gsc.ts` ~line
233-240) calls `fetchSearchAnalytics` without a `type` filter, so the API
returns rows combined across web/image/news/video/discover. The dashboard
defaults to `type=web`, causing systematic drift between API totals and
dashboard totals.

## Key Insights
- GSC API default when no `type` passed: combined (NOT web only)
- GSC dashboard "All" tab default: `type=web`
- Existing backfill code already uses `type: 'web'` — cron is the outlier
- Fix is one-line; affects only future cron rows

## Requirements
- Functional: cron-aggregated fetch passes `type: 'web'`
- Non-functional: behavior matches backfill and dashboard

## Architecture / Data Flow
```
Cron daily run
  └─► client.fetchSearchAnalytics({ siteUrl, dimensions: ['date'], type: 'web' })
        └─► gscDataAggregated row (clicks, impr, ctr, pos for web only)
```

## Related Code Files
- Modify: `packages/api-app/src/jobs/sync-gsc.ts` (~line 235-240, aggregated fetch block)
- Read for context: same file, backfill section (already uses `type: 'web'`)
- Read for context: `packages/api-app/src/utils/gsc-client.ts` (verify `fetchSearchAnalytics` accepts `type`)

## Implementation Steps

### Step 1 — Update `fetchSearchAnalytics` to accept and forward `type`

**CRITICAL**: The function currently does NOT forward `type` to the API requestBody.
Must fix the function signature first (line ~79-83 in sync-gsc.ts):

```ts
// BEFORE — type is ignored even if passed:
async fetchSearchAnalytics(options: any) {
    const { siteUrl, startDate, endDate, dimensions, rowLimit = 25000, startRow = 0 } = options;
    requestBody: { startDate, endDate, dimensions, rowLimit, startRow, dimensionFilterGroups: [] }
}

// AFTER — type is destructured and forwarded:
async fetchSearchAnalytics(options: any) {
    const { siteUrl, startDate, endDate, dimensions, rowLimit = 25000, startRow = 0, type } = options;
    requestBody: { startDate, endDate, dimensions, rowLimit, startRow, dimensionFilterGroups: [], ...(type && { type }) }
}
```

### Step 2 — Add `type: 'web'` to the aggregated fetch call (~line 235)

```ts
const aggData = await client.fetchSearchAnalytics({
    siteUrl,
    startDate: dateStr,
    endDate: dateStr,
    dimensions: ['date'],
    type: 'web',  // ADD THIS
});
```

### Step 3 — Verify raw row-level fetch also uses `type: 'web'`
Add `type: 'web'` to the `fetchAllSearchAnalytics` call for `gscData` insert.
Inconsistency between raw and aggregated tables re-introduces drift.

### Step 4 — Compile check
```bash
npx tsc -p packages/api-app/tsconfig.json --noEmit
```

5. Smoke test: trigger one manual cron run on a small project. Diff one day's
   row in `gscDataAggregated` (post-fix) vs GSC dashboard same date.

## Todo
- [ ] Update `fetchSearchAnalytics` to destructure + forward `type` in requestBody
- [ ] Add `type: 'web'` to aggregated fetch call
- [ ] Add `type: 'web'` to raw row-level fetch call
- [ ] Type-check passes
- [ ] Manual cron run verified against dashboard

## Success Criteria
- New cron rows for 1 day match GSC dashboard "All" tab totals exactly
- No regression in existing pages/queries data shape

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Historical rows still mixed-type | High | Medium | Backfill rerun (separate plan); document in known-issues |
| `fetchSearchAnalytics` doesn't accept `type` param | Low | Low | Verify signature first; trivial param addition if missing |
| Web-only excludes meaningful image/discover traffic for some projects | Low | Low | Phase 02 matches dashboard default; future per-project type config out of scope |

## Backwards Compatibility
- Existing rows in `gscDataAggregated` remain (mixed-type); new rows accurate
- Until backfill, charts will show step-change at fix-deploy date
- Document this in journal entry

## Rollback
Single-line revert. No data change required for rollback (revert reverts future cron behavior only).

## Next Steps
- **Phase 04** (this plan): run `npm run backfill-gsc-agg` with `type: 'web'` to overwrite historical rows.
