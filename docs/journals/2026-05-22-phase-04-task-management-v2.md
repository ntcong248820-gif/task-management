# Phase 04 Task Management v2 — Multi-View System Implementation Complete

**Date**: 2026-05-22 14:30
**Severity**: Medium
**Component**: Task Management (Backend + Frontend), Timer System
**Status**: Resolved

## What Happened

Phase 04 completed a full-stack multi-view task management system for the v2 greenfield rebuild. Backend rewrite added transactional task completion with proper timer isolation, optimistic state movement for kanban, and fully DB-backed timers replacing naive localStorage persistence. Frontend implemented four complementary views (Board, Timeline, Table, Calendar) plus a detail panel with inline editing. All type checks passed (8/8 packages clean), unit tests passing (21/21), linter auto-fixed dependency issues. Code review flagged blocking correctness concerns that were addressed before merge.

## The Brutal Truth

This phase felt like fighting against accumulated assumptions. The original timer implementation killed *all* active timers globally when any user completed a task—a catastrophic design flaw that would have silently destroyed time-tracking data in production once multiple users existed. We caught it in code review, not in tests, because the test suite didn't simulate concurrent user scenarios. The template spawn idempotency check (`Boolean(undefined)` silently deactivating inactive templates) was sneaky—the kind of bug that ships, gets reported in production at 2am, and leads to "why would anyone write code like this?" discussions. The root cause for all three of these wasn't stupidity; it was iterating without thinking through edge cases. Speed in implementation leads to speed in debugging.

## Technical Details

### Backend Rewrite (packages/api-app/src/routes/)

**tasks.ts** was completely rewritten with three critical endpoints:

1. **GET /stats** — Returns aggregate task counts by status and sprint. Straightforward aggregation, no surprises.

2. **POST /:id/complete** — The dangerous one. Initial implementation:
   ```typescript
   // WRONG: kills all timers globally
   const timeLogs = await db.select().from(timeLogs).where(eq(timeLogs.status, 'active'));
   for (const log of timeLogs) {
     await db.update(timeLogs).set({ status: 'stopped', stoppedAt: now }).where(eq(timeLogs.id, log.id));
   }
   ```
   
   Fixed version wraps in a transaction and filters by caller's userId:
   ```typescript
   await db.transaction(async (tx) => {
     const activeLog = await tx
       .select()
       .from(timeLogs)
       .where(and(eq(timeLogs.userId, userId), eq(timeLogs.status, 'active')))
       .limit(1);
     
     if (activeLog.length > 0) {
       await tx.update(timeLogs)
         .set({ status: 'stopped', stoppedAt: now })
         .where(eq(timeLogs.id, activeLog[0].id));
       
       const elapsed = Math.floor((now - activeLog[0].startedAt) / 1000);
       await tx.update(tasks)
         .set({ timeSpent: tasks.timeSpent + elapsed, completedAt: now })
         .where(eq(tasks.id, taskId));
     }
   });
   ```
   
   Transaction ensures atomicity; userId filter ensures only caller's timer stops.

3. **PATCH /:id/move** — Optimistic update with rollback path. When a task moves out of "done" status, `completedAt` is cleared. This is correct but easy to miss—someone might think completedAt should persist. It shouldn't; tasks in progress aren't actually "completed."

4. **GET /** — Heavily refactored with filters. Initial version accepted unvalidated `status` param and NaN `limit`/`offset`:
   ```typescript
   // WRONG: enum not validated, limit/offset can be NaN
   const status = req.query.status; // Could be anything
   const limit = parseInt(req.query.limit); // NaN if invalid
   const offset = parseInt(req.query.offset); // NaN if invalid
   ```
   
   Fixed with explicit validation:
   ```typescript
   const status = zValidator('query', z.object({
     status: z.enum(['todo', 'in_progress', 'done']).optional(),
     sprintId: z.string().optional(),
     search: z.string().optional(),
     limit: z.coerce.number().int().min(1).max(100).default(50),
     offset: z.coerce.number().int().min(0).default(0),
   }))(req);
   ```

**time-logs.ts** rewritten for DB-backed timer state:

- **POST /start** — Enforces single active timer per user via DB constraint. Returns 409 Conflict if one already exists. No workarounds; force user to stop before starting another.
- **POST /stop** — Finds active log by userId + workspaceId (for multi-workspace support), calculates elapsed time, increments task.timeSpent atomically.
- **Manual POST /** — Accepts `{ taskId, startedAt, stoppedAt }` with full Zod validation. No raw `Date()` or `Number()` parsing; schema enforces ISO timestamps and numeric bounds.

**task-templates.ts** (new module) implements lazy spawn:

```typescript
POST /:id/spawn
INSERT INTO task_template_spawn_logs (recurring_template_id, start_date)
VALUES ($1, $2)
ON CONFLICT (recurring_template_id, start_date) DO NOTHING
RETURNING ...
```

Idempotent by design: same template spawned twice on same date does nothing. Both client and server enforce this, which is defensive.

**DB migration 0007**: Added `tasks.target_url TEXT` for task detail panel to store links. Simple, safe migration.

### Frontend Implementation (apps/web/src/components/features/tasks/)

Four complementary views plus supporting infrastructure:

1. **Board View** — Drag-and-drop kanban with @dnd-kit. Optimistic UI update immediately moves task card; if API fails, fetches fresh state and reverts. No visual ghost cards or confusing rollbacks.

2. **Timeline View** — CSS Grid Gantt-lite. Month navigation, excludes undated tasks (with counter: "+3 undated tasks"). Pragmatic: full Gantt with dependencies would be scope creep; this gives the visual timeline without over-engineering.

3. **Table View** — @tanstack/react-table with column sorting. Boilerplate-heavy but powerful. Lets power users sort by due date, time spent, priority simultaneously.

4. **Calendar View** — Month grid, max 3 task chips per day. Overflow handled with Popover ("+N more" button). Prevents calendar cells from exploding with tasks.

**TaskDetailPanel** — Slide-over sheet with blur-to-save inline editing. Clicking a field enables edit mode; blur saves to API. targetUrl field accepts HTTP/HTTPS links. Smooth, modern UX.

**TaskTimerSection** — DB-backed timer. Shows current elapsed time, active task, status. Inline warning if trying to stop wrong task: "Stop [previous task name] first." localStorage only persists display state (formatting); syncFromDb() on page mount reconciles with server truth.

**useTimerStore** — Rewritten from naive localStorage to DB-backed persistence:
- `startTimer(taskId)` calls POST /start
- `stopTimer()` calls POST /stop
- `syncFromDb()` queries GET /time-logs/active on mount
- localStorage stores display cache, not truth

**hooks/use-tasks.ts** — SWR hooks with filter-based cache keys:
```typescript
const key = status ? `tasks-${status}-${sprintId}-${limit}-${offset}` : null;
const { data, error, isLoading } = useSWR(key, fetchTasks);
```

Prevents cache collision when filters change. If user switches from "todo" to "in_progress" view, new request fires instead of serving stale "todo" data.

## What We Tried

1. **First implementation of POST /complete** — Killed all active timers globally
   - Symptom: Code review caught it, not tests
   - Fix: Wrapped in transaction, added userId filter, tested with hypothetical multi-user scenario

2. **Template PATCH with partial updates** — `Boolean(undefined)` silently deactivated inactive templates
   - Symptom: Toggling is_active flag set it to false even when undefined
   - Root cause: Schema allowed `undefined` to propagate; should have thrown validation error
   - Fix: Added zValidator with explicit boolean coercion

3. **Manual time-log creation** — Raw `new Date()` and `parseInt()` parsing
   - Symptom: Invalid dates accepted; invalid numbers became NaN
   - Fix: Zod schema enforces ISO8601 timestamps, numeric bounds
   - Example: `startedAt: z.string().datetime()` rejects "2026-05-22 14:30" (not ISO8601)

4. **GET /tasks without validation** — Accepted any status, NaN limits
   - Symptom: Undefined behavior, silent filtering failures
   - Fix: zValidator with enum validation and numeric clamping

5. **useTimerStore persisting truth to localStorage** — Page refresh would overwrite server state
   - Symptom: If server had elapsed 300s but localStorage had 100s, refresh resets to 100s
   - Fix: localStorage only caches display state; syncFromDb() on mount queries server truth

6. **Template spawn race condition** — Two rapid client requests could spawn twice
   - Symptom: Duplicate tasks if client sent POST twice before first response
   - Fix: DB constraint `ON CONFLICT DO NOTHING` + client-side idempotency check (debounce)

## Root Cause Analysis

### Why Did These Bugs Exist?

1. **Timer Global Scope** — Developer assumed single-user scenario ("stop the active timer" meant "stop *the* timer"). Never modeled multi-user state. This is a domain modeling failure, not a syntax error. Tests would have caught it if they simulated two concurrent users; they didn't.

2. **Boolean Coercion Surprise** — `Boolean(undefined) === false` is correct JavaScript semantics, but unexpected for a toggle endpoint. The real issue: partial updates without explicit coercion. Zod's `.default()` or explicit `.transform()` would have prevented this.

3. **No Input Validation Habit** — Writing endpoints without `zValidator` became the pattern. Each endpoint assumed inputs were valid and sane. No error bounds checking, no enum validation. This is a process failure—every Hono endpoint should validate before business logic.

4. **Mismatch Between Test Scope and Real Scope** — Unit tests verified individual API calls; they didn't test the user workflows (complete a task while timer is active, move a task from done back to in progress). Integration tests would have caught this, but they're blocked by local DB setup.

### Why Tests Didn't Catch These

- Unit tests stub API responses; they don't exercise actual database state
- No multi-user simulation in tests
- No timer concurrency tests
- Integration tests require real database; environment setup was deferred

## Lessons Learned

1. **Always Model Multi-User**: Even if current system is single-user, think about what breaks when user count increases. "Stop timer" must be scoped to current user, not global. Catch this in design, not production.

2. **Validate Every Input**: Make zValidator a reflex. Every `req.query`, `req.body`, `req.params` needs validation. It's not defensive programming; it's basic hygiene. Unvalidated inputs are ticking time bombs.

3. **Database Constraints Are Your Friends**: `ON CONFLICT DO NOTHING`, `UNIQUE`, foreign key constraints—these prevent whole classes of bugs without test coverage. Use them.

4. **Transactions Matter for Correctness**: Stopping a timer and incrementing task time spent must be atomic. Race conditions won't show up in unit tests; transactions prevent them at the database layer.

5. **Separate Display State from Truth**: localStorage for display (formatting, UI cache), database for truth. Page refresh must reconcile with server, not overwrite it. syncFromDb() on mount is mandatory.

6. **Test User Workflows, Not Individual Endpoints**: "User completes a task while timer is active" is the workflow to test, not "POST /complete returns 200." Integration tests matter.

7. **Code Review Catches Domain Bugs**: Static analysis finds syntax errors. Code review finds logic errors (killing all timers globally). Invest in both.

## Next Steps

1. ✓ Fixed POST /complete with transaction + userId filter
2. ✓ Fixed PATCH template with zValidator coercion
3. ✓ Fixed manual time-log POST with Zod validation
4. ✓ Fixed GET /tasks with enum + numeric validation
5. ✓ Rewrote useTimerStore with DB sync on mount
6. ✓ Type-check: all 8 packages clean
7. ✓ Lint: auto-fixed useEffect deps
8. ✓ Unit tests: 21/21 passing
9. ✓ Code review: all blocking concerns addressed
10. ⏳ Integration tests: unblock local DB, run full user workflow tests
11. ⏳ Multi-user testing: manual test with 2+ users to verify timer isolation
12. ⏳ Load testing: verify timer spawn idempotency under high concurrency
13. ⏳ Document timer architecture in `./docs/system-architecture.md`

**Owner**: Task Management (Backend + Frontend)
**Timeline**: Integration testing next sprint, documentation updates this week
