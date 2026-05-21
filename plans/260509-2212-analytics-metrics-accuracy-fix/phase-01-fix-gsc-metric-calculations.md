# Phase 01 — Fix GSC Metric Calculations

**Priority:** P1 (Critical) | **Status:** pending | **Effort:** 1.5h

## Overview
Fix three correctness bugs and one consistency bug in `packages/api-app/src/routes/analytics.ts`:
- C1: CTR uses unweighted AVG (wrong; should be SUM(clicks)/SUM(impressions))
- C2: Position uses unweighted AVG (wrong; should be impression-weighted)
- H3: No site filter → silently sums all GSC sites for a project
- M2: Chart reads `gscData` (raw, sparse) while KPI reads `gscDataAggregated`

## Key Insights
- GSC official: CTR = clicks/impressions; Position = Σ(pos × impr)/Σ(impr)
- `gscDataAggregated` rows are 1-per-(projectId, siteUrl, date) → SUM is exact, no double-count
- Project record has `domain` field; default site URL = first matching `gscSites` row by domain (mirror `getOrDiscoverSiteUrl` logic from sync job)

## Requirements
- Functional:
  - Return CTR computed in app layer from SUM(clicks)/SUM(impressions)
  - Return impression-weighted position from SQL
  - Default GSC queries to project's matched site URL when `siteUrl` query param absent
  - Chart series read from `gscDataAggregated` (same source as KPI)
- Non-functional:
  - Response shape unchanged (no web breakage)
  - Both `/` (combined) and `/gsc` endpoints fixed identically

## Architecture / Data Flow
```
Project.domain → resolve siteUrl (gscSites.siteUrl LIKE %domain%)
       │
       ▼
gscDataAggregated [projectId, siteUrl, date] (1 row/day)
       │
       ├─► KPI: SUM(clicks), SUM(impr), SUM(clicks)/SUM(impr), SUM(pos*impr)/SUM(impr)
       └─► Chart: same table, daily series
```

## Related Code Files
- Modify: `packages/api-app/src/routes/analytics.ts` (lines ~41-260, both `/` and `/gsc` handlers)
  - **Add to import**: `projects` table (currently missing — needed for `resolveProjectSiteUrl`)
  - Current import: `import { db, gscData, gscSites, ga4Data, gscDataAggregated, eq, sql, and, gte, lte } from '@repo/db';`
  - Add `projects` to the import list
- Read for context: `packages/api-app/src/jobs/sync-gsc.ts` (`getOrDiscoverSiteUrl` logic)
- Read for context: `packages/db/src/schema.ts` (project, gscSites, gscDataAggregated)

## Implementation Steps

1. Extract helper `resolveProjectSiteUrl(projectId)` (top of analytics.ts):
   - Query `projects` for domain
   - Query `gscSites` where `projectId = X AND siteUrl ILIKE '%domain%'` LIMIT 1
   - Return `siteUrl` or `null`

2. Replace SQL aggregation in BOTH `/` (line ~71) and `/gsc` (line ~158, ~188) with:
```sql
SUM(clicks)                                                   AS total_clicks,
SUM(impressions)                                              AS total_impressions,
SUM(CAST(position AS DECIMAL) * impressions)
  / NULLIF(SUM(impressions), 0)                               AS weighted_position
```
(Drop `avgCtr` from SQL — compute in app.)

3. App-layer CTR:
```ts
const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
```
Multiply by 100 for response (matches existing behavior).

4. Default siteUrl resolution (both handlers):
```ts
const resolvedSiteUrl = siteUrl || await resolveProjectSiteUrl(parseInt(projectId));
if (resolvedSiteUrl) whereConditions.push(eq(gscDataAggregated.siteUrl, resolvedSiteUrl));
```
Include `resolvedSiteUrl` in response so client can display "Showing data for: site.com".

5. Chart query (M2): replace `gscData` with `gscDataAggregated`, drop `groupBy(date)` (already 1-per-day per site after siteUrl filter):
```ts
.from(gscDataAggregated)
.where(and(eq(...projectId), gte(date, start), lte(date, end), eq(siteUrl, resolvedSiteUrl)))
.orderBy(gscDataAggregated.date)
```

6. Compile check: `npx tsc -p packages/api-app/tsconfig.json --noEmit`

## Todo
- [ ] Add `resolveProjectSiteUrl` helper
- [ ] Fix SQL aggregation in `/` handler
- [ ] Fix SQL aggregation in `/gsc` current+previous period
- [ ] Compute CTR in app layer (drop `avgCtr` SQL)
- [ ] Default siteUrl from project.domain
- [ ] Switch chart query to `gscDataAggregated`
- [ ] Add `resolvedSiteUrl` to response payload
- [ ] Type-check passes

## Success Criteria
- Single project with 3 GSC sites returns numbers for the matched site only
- CTR diff vs GSC dashboard < 0.5%
- Position diff vs GSC dashboard < 0.3
- Chart and KPI sums equal for the same date range

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Project has no matching gscSite | Medium | Medium | Fallback: return all sites with warning flag in payload |
| `position` stored as text — cast NaN | Low | Low | Existing CAST handles; NULLIF guards divide-by-zero |
| Frontend breaks on new `resolvedSiteUrl` field | Low | Low | Additive field — no breakage |

## Rollback
Single-file revert. No DB or schema change.

## Next Steps
After phase 02 ships, consider backfill rerun to make historical
`gscDataAggregated` consistent with `type: 'web'` filter (separate plan).
