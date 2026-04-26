# Phase 2 — Backend Optimization

**Priority:** P1 | **Effort:** ~4h | **Status:** ✅ Done  
**Depends on:** Phase 1 (security fixes), Phase 3 (DB schema)

## Context Links
- Plan: [plan.md](./plan.md)
- Research: [researcher-01-backend-database.md](./research/researcher-01-backend-database.md)
- API entry: `apps/api/src/index.ts`
- Routes: `apps/api/src/routes/`
- DB package: `packages/db/src/index.ts`

## Overview

Optimize Hono backend: add Zod validation, pagination on list endpoints, fix DB import paths, clean debug logging, and optimize N+2 queries in analytics/rankings.

## Key Insights

- No Zod on any route — manual `if (!body.field)` checks are inconsistent and miss type coercion
- `GET /api/tasks` returns ALL rows — no pagination, will degrade with data growth
- `rankings.ts` fires 2 sequential DB queries (current + prev period) per request — a CTE cuts this to 1
- `analytics.ts` imports `gscDataAggregated` directly from internal path `@repo/db/src/schema/gsc_data_aggregated` bypassing the package index
- `projects.ts` has leftover `console.error` + `JSON.stringify` debug blocks alongside the structured logger

## Requirements

- All POST/PUT routes validate body with Zod
- List endpoints (`/api/tasks`, `/api/projects`) support `?limit` + `?offset` pagination
- No direct internal imports from `@repo/db/src/schema/*` — only `@repo/db`
- No `console.error`/`console.log` outside the logger utility
- Rankings uses single optimized query

## Architecture

### Zod Validation Pattern (Hono)

```ts
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1),
  projectId: z.number().int().positive(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

app.post('/', zValidator('json', createTaskSchema), async (c) => {
  const body = c.req.valid('json'); // fully typed
  // ...
});
```

### Pagination Pattern

```ts
const page = Math.max(1, parseInt(c.req.query('page') || '1'));
const limit = Math.min(100, parseInt(c.req.query('limit') || '50'));
const offset = (page - 1) * limit;

const [rows, [{ total }]] = await Promise.all([
  db.select().from(tasks).where(...).limit(limit).offset(offset),
  db.select({ total: sql<number>`count(*)` }).from(tasks).where(...),
]);
return c.json({ data: rows, total: Number(total), page, limit });
```

### Rankings CTE Optimization

```sql
-- Replace 2 queries with 1 CTE
WITH periods AS (
  SELECT query,
    AVG(position) FILTER (WHERE date >= $current_start) AS current_pos,
    AVG(position) FILTER (WHERE date < $current_start) AS prev_pos,
    SUM(clicks)   FILTER (WHERE date >= $current_start) AS current_clicks
  FROM gsc_data
  WHERE project_id = $1 AND date BETWEEN $prev_start AND $current_end
  GROUP BY query
)
SELECT *, (prev_pos - current_pos) AS position_change FROM periods
```

## Related Code Files

**Modify:**
- `apps/api/src/routes/tasks.ts` — add Zod, add pagination to GET /
- `apps/api/src/routes/projects.ts` — add Zod to POST/PUT, remove console.error blocks
- `apps/api/src/routes/correlation.ts` — fix missing projectId validation (bug fix O1)
- `apps/api/src/routes/rankings.ts` — combine period queries with filter aggregation
- `apps/api/src/routes/analytics.ts` — fix `@repo/db/src/schema/...` import

**Create:**
- `apps/api/src/schemas/task-schema.ts` — Zod schemas for task routes
- `apps/api/src/schemas/project-schema.ts` — Zod schemas for project routes

**Install:**
- `@hono/zod-validator` in `apps/api/package.json`

## Implementation Steps

1. `cd apps/api && npm install @hono/zod-validator zod`
2. Create `apps/api/src/schemas/task-schema.ts` with Zod schemas
3. Create `apps/api/src/schemas/project-schema.ts` with Zod schemas
4. Refactor `tasks.ts` — add `zValidator`, add pagination to GET /
5. Refactor `projects.ts` — add `zValidator`, remove debug `console.error` blocks
6. Fix `analytics.ts` — replace `@repo/db/src/schema/gsc_data_aggregated` with proper export from `@repo/db`
7. Add `gscDataAggregated` to `packages/db/src/index.ts` exports
8. Optimize `rankings.ts` — merge period queries using filter aggregation
9. Fix `correlation.ts` — return 400 on missing projectId
10. Run `npm run type-check` and `npm run lint`

## Todo

<!-- Updated: Validation Session 1 - Pagination removed from scope (deferred) -->
<!-- Completed: 2026-04-26 -->
- [x] Install `@hono/zod-validator`
- [x] Create `apps/api/src/schemas/task-schema.ts`
- [x] Create `apps/api/src/schemas/project-schema.ts`
- [x] Add Zod validation to `tasks.ts` (POST, PUT)
- [x] ~~Add pagination to `GET /api/tasks`~~ *(deferred — low data volume at 5-10 users)*
- [x] Add Zod validation to `projects.ts` (POST, PUT)
- [x] Remove debug `console.error` blocks from `projects.ts`
- [x] Fix internal import in `analytics.ts`
- [x] Export `gscDataAggregated` from `packages/db/src/index.ts`
- [x] Optimize rankings period query
- [x] Fix `correlation.ts` projectId validation
- [x] Run lint + type-check

## Success Criteria

- POST /api/tasks with missing `title` returns 400 with Zod error message
- GET /api/rankings loads in < 1s for 25K row dataset
- No `@repo/db/src/schema/*` imports in route files
- Zero `console.error` calls in `projects.ts`

## Risk Assessment

- Zod validation may reject previously-accepted malformed requests — test with existing data shapes
- Pagination breaks existing frontend code that expects a flat array — frontend must handle `{ data, total }` shape

## Security Considerations

- Zod prevents type injection (e.g. passing object where string expected)
- Pagination prevents DoS via huge response payloads

## Next Steps

→ Phase 4 (Frontend) must update data fetching hooks to handle paginated `{ data, total }` response shape
