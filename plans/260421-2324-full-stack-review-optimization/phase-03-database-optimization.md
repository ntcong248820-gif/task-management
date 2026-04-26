# Phase 3 — Database Optimization

**Priority:** P1 | **Effort:** ~2h | **Status:** ✅ Done  
**Depends on:** Phase 1 (lastSyncedAt column already added there)

## Context Links
- Plan: [plan.md](./plan.md)
- Research: [researcher-01-backend-database.md](./research/researcher-01-backend-database.md)
- Schema dir: `packages/db/src/schema/`
- Bug fix plan: [../260421-2324-bug-fix-security-hardening/phase-02-oauth-flow-fixes.md]

## Overview

Improve DB schema correctness and query performance: add missing indexes, add check constraints for enum-like text columns, remove committed build artifacts from git.

## Key Insights

- `tasks.status` and `tasks.taskType` are plain `text` — any string can be inserted; no DB enforcement
- `ga4_data` table has no composite date index — date-range queries do full scans
- `gsc_data_aggregated` exists but rankings route still queries raw `gsc_data` for aggregations
- `.js` build files are tracked in git for `packages/db/src/schema/` (8 files) — bloats repo, causes confusion
- `packages/db/src/index.ts` doesn't export `gscDataAggregated` — routes import it directly from internal path

## Requirements

- All text columns that behave as enums have check constraints
- `ga4_data` has a usable composite date+project index
- `packages/db/src/index.ts` exports all schema tables
- Build artifacts removed from git tracking
- `.gitignore` updated to prevent future artifact commits

## Architecture

### Check Constraints via Drizzle

```ts
// In tasks schema
import { check } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  status: text('status').notNull().default('todo'),
  taskType: text('task_type'),
  // ...
}, (table) => ({
  statusCheck: check('tasks_status_check',
    sql`${table.status} IN ('todo', 'in_progress', 'done')`),
  taskTypeCheck: check('tasks_task_type_check',
    sql`${table.taskType} IS NULL OR ${table.taskType} IN ('technical', 'content', 'links')`),
}));
```

### GA4 Date Index

```ts
// In ga4_data schema
ga4ProjectDateIdx: index('ga4_data_project_date_idx').on(table.projectId, table.date),
```

### Fix DB Package Exports

```ts
// packages/db/src/index.ts — add missing exports
export * from './schema/gsc_data_aggregated'; // currently missing
export * from './schema/ga4_data';
export * from './schema/gsc_data';
// etc.
```

## Related Code Files

**Modify:**
- `packages/db/src/schema/tasks.ts` — add check constraints for status + taskType
- `packages/db/src/schema/ga4_data.ts` — add composite (projectId, date) index
- `packages/db/src/index.ts` — export `gscDataAggregated` and verify all tables exported

**Update:**
- `.gitignore` — add `packages/db/src/**/*.js` and `packages/db/src/**/*.d.ts`

**Delete (from git tracking):**
- `packages/db/src/schema/ga4_data.js`
- `packages/db/src/schema/gsc_data.js`
- `packages/db/src/schema/gsc_data_aggregated.js`
- `packages/db/src/schema/integrations.js`
- `packages/db/src/schema/projects.js`
- `packages/db/src/schema/tasks.js`
- `packages/db/src/schema/time-logs.js`
- `packages/db/src/schema/index.js`

<!-- Updated: Validation Session 1 - Added data audit step + interface-visual archiving -->

## Implementation Steps

1. **Audit existing data first** — run before adding constraints:
   ```sql
   SELECT DISTINCT status FROM tasks;
   SELECT DISTINCT task_type FROM tasks;
   ```
   Clean up any invalid values before step 2.

2. Add check constraints to `packages/db/src/schema/tasks.ts`
2. Add `ga4ProjectDateIdx` to `packages/db/src/schema/ga4_data.ts`
3. Verify and fix exports in `packages/db/src/index.ts`
4. Run `npm run db:push` to apply schema changes to database
5. Update root `.gitignore` — add build artifact patterns
6. Run `git rm --cached packages/db/src/schema/*.js packages/db/src/schema/index.js`
7. Commit `.gitignore` update + artifact removal
8. Verify `npm run build` still compiles DB package correctly

## Todo

- [x] Add `statusCheck` constraint to `tasks` schema
- [x] Add `taskTypeCheck` constraint to `tasks` schema
- [x] Add `ga4ProjectDateIdx` to `ga4_data` schema
- [x] Verify all schema tables exported from `packages/db/src/index.ts`
- [x] Add `gscDataAggregated` export to `packages/db/src/index.ts`
- [x] Run `npm run db:push`
- [x] Add gitignore rules for `packages/db/src/**/*.js`
- [x] Run `git rm --cached` on all `.js` artifacts in schema dir
- [x] Verify build still works after artifact removal
- [x] **Archive `interface-visual/`** → move to `assets/designs/interface-visual/`

## Success Criteria

- Inserting `status: 'invalid'` into tasks fails at DB level with check constraint error
- `EXPLAIN ANALYZE` on GA4 date query shows index scan (not seq scan)
- `from '@repo/db'` covers all schema imports — no `@repo/db/src/schema/...` paths
- `git ls-files packages/db/src/schema/*.js` returns empty

## Risk Assessment

- Check constraints will reject any existing rows with invalid status values — audit data first
- After `db:push`, existing deployed API must be checked for broken queries

## Security Considerations

- Check constraints prevent SQL injection via enum columns (defense in depth)
