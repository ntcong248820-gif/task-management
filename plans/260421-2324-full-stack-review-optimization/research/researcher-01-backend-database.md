---
title: Backend & Database Analysis
date: 2026-04-25
---

# Backend & Database Review

## Backend — Hono API

### Issues Found

**Validation**
- No Zod on request bodies — routes do manual field checking (`if (!body.title)`) which is brittle and inconsistent
- `correlation.ts` defaults `projectId` to 1 silently instead of returning 400
- `gsc.ts` and `ga4.ts` sync endpoints accept unbounded `days` param (no min/max clamp)

**Query Efficiency**
- `GET /api/tasks` returns all tasks with no pagination — will degrade as rows grow
- `rankings.ts` runs 2 separate sequential DB queries (current + previous period) — can be combined with a single CTE
- `analytics.ts` imports directly from internal path `@repo/db/src/schema/gsc_data_aggregated` instead of through `@repo/db` index export

**Code Quality**
- `projects.ts` has leftover `console.error` + `JSON.stringify(error)` debug blocks that bypass the logger
- `jobs/index.ts` uses `require()` inside functions in an ESM context — undefined behavior risk
- No OpenAPI/Swagger docs — API is undiscoverable for new devs
- Debug `/debug/db` endpoint exposed in production (HIGH — covered in bug-fix plan)

**Security**
- OAuth tokens stored plaintext (HIGH — covered in bug-fix plan)
- No rate limiting (HIGH — covered in bug-fix plan)
- Hardcoded Vercel URL in CORS (covered in bug-fix plan)

### Recommendations

1. **Add Zod validation** — `hono/zod-validator` middleware, define schemas per route
2. **Add pagination** to `GET /api/tasks` — `?limit=50&offset=0`, return `{ data, total, hasMore }`
3. **CTE for period-over-period** — single query using `CASE WHEN date >= X THEN 'current' ELSE 'prev' END`
4. **Fix `@repo/db` internal import** — add `gscDataAggregated` to `packages/db/src/index.ts` exports
5. **Clean `projects.ts`** — remove `console.error` blocks, use logger only

---

## Database — PostgreSQL + Drizzle

### Issues Found

**Schema Design**
- `tasks.status` is `text` with no DB constraint — could store any string value
- `tasks.taskType` is `text` — same issue
- `projects` table has no `gscSiteUrl` or `ga4PropertyId` — these live in separate tables (`gsc_sites`, `ga4_properties`), requiring extra joins for common operations
- `oauth_tokens` missing `lastSyncedAt` column — `createdAt` incorrectly used as last sync time (covered in bug-fix plan)

**Performance**
- `gsc_data` unique index spans 6 columns: `(project_id, date, page, query, country, device)` — upsert conflict checks are slow on large tables
- `rankings.ts` aggregates directly from raw `gsc_data` (25K+ rows) on every request — should use `gsc_data_aggregated`
- `ga4_data` has no date range index — date filtering scans full table
- `gsc_data_aggregated` table exists but analytics route queries raw `gsc_data` for chart data too

**Artifacts**
- `.js` build files committed to `packages/db/src/schema/` (8 files) — should be gitignored

### Recommendations

1. **Add DB enums or check constraints** for `status` ('todo','in_progress','done') and `taskType`
2. **Add `ga4_data` date index**: `index('ga4_data_date_idx').on(table.projectId, table.date)`
3. **Route analytics queries through `gsc_data_aggregated`** instead of raw `gsc_data` where possible
4. **Add `lastSyncedAt`** to `oauth_tokens` (covered in bug-fix plan)
5. **Gitignore build artifacts**: `packages/db/src/**/*.js`

---

## Unresolved Questions

1. Is `gsc_data_aggregated` kept up-to-date by the sync jobs, or is it only populated once?
2. What's the actual row count of `gsc_data` — is partitioning by date worth adding?
3. Should `tasks.status` use a Postgres enum or check constraint?
