# Phase 03 — Add ga4DataDaily Table + Accurate Users Sync (Option B)

**Priority:** P1 (High) | **Status:** pending | **Effort:** 2h

## Overview
Current GA4 sync stores rows per `[date, source, medium, device]`. Summing `users`
across those rows double-counts returning users (GA4 `totalUsers` is HyperLogLog++
per dimension combo, not additive). Official GA4 docs confirm: query with
`dimensions=[date]` only for closest-to-accurate unique user count (~±1.63% HLL error).

This phase adds a `ga4DataDaily` table, updates the sync job to fetch date-only
GA4 data in a second query, and switches the analytics API to read users from it.

## Key Insights (from official GA4 docs)
- `totalUsers` per dimension row = HLL++ approximation for that row's user set
- Summing across rows: returning users counted N times (once per source/medium/device combo visited)
- Query with `dimensions=[date]` only → daily active users (still HLL++ ~±1.63%, but no cross-dim double-count)
- BigQuery `COUNT(DISTINCT user_pseudo_id)` = exact, but out of scope
- `sessions`, `conversions`, `revenue` remain correct via existing SUM approach

## Requirements
- Functional:
  - New `ga4DataDaily` table: `(projectId, date, users, newUsers, sessions)` — date-only group
  - `sync-ga4.ts` does second runReport with `dimensions=[date]` → upserts to `ga4DataDaily`
  - `analytics.ts` reads `users` from `ga4DataDaily`, keeps sessions/revenue from `ga4Data`
- Non-functional:
  - DB migration safe (additive table, no existing columns changed)
  - Response field `totalUsers` stays (now accurate); `totalUserSessions` dropped

## Architecture / Data Flow (Option B)
```
GA4 API (per sync run)
  ├─► runReport [date, source, medium, device]  →  ga4Data (sessions, conversions, revenue)
  └─► runReport [date]                           →  ga4DataDaily (users, newUsers) ← NEW

Analytics API
  ├─► SUM(sessions)     from ga4Data       → totalSessions    ✅
  ├─► SUM(users)        from ga4DataDaily  → totalUsers       ✅ (accurate)
  ├─► SUM(conversions)  from ga4Data       → totalConversions ✅
  └─► SUM(revenue)      from ga4Data       → totalRevenue     ✅
```

## Related Code Files
- Create: `packages/db/src/schema/ga4-data-daily.ts` (new table schema)
- Modify: `packages/db/src/index.ts` (export new table)
- Modify: `packages/api-app/src/jobs/sync-ga4.ts` (add second runReport)
- Modify: `packages/api-app/src/routes/analytics.ts` (read users from ga4DataDaily)

## Implementation Steps

### Step 1 — Schema: create `ga4DataDaily` table
```ts
// packages/db/src/schema/ga4-data-daily.ts
import { pgTable, serial, integer, date, timestamp } from 'drizzle-orm/pg-core';

export const ga4DataDaily = pgTable('ga4_data_daily', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    users: integer('users').notNull().default(0),
    newUsers: integer('new_users').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    uniqueProjectDate: uniqueIndex('ga4_data_daily_project_date_idx').on(table.projectId, table.date),
}));
```

Run: `npm run db:push`

### Step 2 — Export from db package
```ts
// packages/db/src/index.ts — add:
export { ga4DataDaily } from './schema/ga4-data-daily';
```

### Step 3 — sync-ga4.ts: add date-only runReport
After existing `runReport` that writes to `ga4Data`, add:
```ts
// Fetch date-only for accurate user count (no cross-dim double-counting)
const dailyReport = await analyticsClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
    ],
});

const dailyRows = (dailyReport.data.rows || []).map((row: any) => ({
    projectId: connection.projectId,
    date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    users: parseInt(row.metricValues[0].value) || 0,
    newUsers: parseInt(row.metricValues[1].value) || 0,
}));

if (dailyRows.length > 0) {
    await db.insert(ga4DataDaily).values(dailyRows).onConflictDoUpdate({
        target: [ga4DataDaily.projectId, ga4DataDaily.date],
        set: {
            users: sql`EXCLUDED.users`,
            newUsers: sql`EXCLUDED.new_users`,
            updatedAt: sql`NOW()`,
        },
    });
}
```

### Step 4 — analytics.ts: read users from ga4DataDaily
In both `/` and `/ga4` handlers, add a separate query for users:
```ts
import { ga4DataDaily } from '@repo/db';

// Existing: sessions/conversions/revenue from ga4Data
const metrics = await db.select({ totalSessions: ..., totalConversions: ..., totalRevenue: ... })
    .from(ga4Data).where(...);

// NEW: accurate users from ga4DataDaily
const userMetrics = await db.select({
    totalUsers: sql<number>`SUM(users)`.as('total_users'),
    totalNewUsers: sql<number>`SUM(new_users)`.as('total_new_users'),
}).from(ga4DataDaily).where(
    and(
        eq(ga4DataDaily.projectId, parseInt(projectId)),
        gte(ga4DataDaily.date, start),
        lte(ga4DataDaily.date, end)
    )
);

// In response:
ga4: {
    totalSessions: Number(metrics[0].totalSessions) || 0,
    totalUsers: Number(userMetrics[0]?.totalUsers) || 0,  // now accurate
    ...
}
```

## Todo
- [ ] Create `packages/db/src/schema/ga4-data-daily.ts`
- [ ] Export from `packages/db/src/index.ts`
- [ ] Run `npm run db:push` to create table
- [ ] Update `sync-ga4.ts` — add second runReport + upsert to `ga4DataDaily`
- [ ] Update `analytics.ts` `/` handler — read users from `ga4DataDaily`
- [ ] Update `analytics.ts` `/ga4` handler — same
- [ ] Run `npm run type-check` across monorepo
- [ ] Trigger manual GA4 sync, verify `ga4DataDaily` has rows
- [ ] Compare API `totalUsers` vs GA4 dashboard (expect ±2% HLL++ variance)

## Success Criteria
- `ga4DataDaily` table exists with rows after first sync
- API `totalUsers` for 7-day window matches GA4 dashboard within ±2%
- No regression in `totalSessions`, `totalConversions`, `totalRevenue`

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DB migration fails | Low | Medium | `db:push` is additive; can retry safely |
| `ga4DataDaily` empty until Phase 04 backfill | High | Medium | API falls back to 0 for users until backfill; document |
| GA4 API rate limit on second runReport | Low | Low | Same project, same auth; small payload (date-only) |

## Rollback
Revert sync-ga4.ts and analytics.ts. `ga4DataDaily` table can remain (empty, unused).
Drop migration only if needed.

## Next Steps
- Phase 04: backfill `ga4DataDaily` for last 30 days via manual script
