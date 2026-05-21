# Code Review — Phase 04 Task Management v2

**Date:** 2026-05-22
**Verdict:** READY_WITH_CONCERNS

---

## Scope

| File | Lines |
|------|-------|
| `packages/db/src/schema/tasks.ts` | 57 |
| `packages/db/src/schema/task-templates.ts` | 25 |
| `packages/db/src/schema/time-logs.ts` | 23 |
| `packages/db/migrations/0007_phase04_target_url.sql` | 1 |
| `packages/api-app/src/routes/tasks.ts` | 245 |
| `packages/api-app/src/routes/time-logs.ts` | 171 |
| `packages/api-app/src/routes/task-templates.ts` | 141 |
| `apps/web/src/hooks/use-tasks.ts` | 64 |
| `apps/web/src/stores/useTimerStore.ts` | 110 |
| `apps/web/src/app/dashboard/tasks/page.tsx` | 145 |
| `apps/web/src/components/features/tasks/kanban-board.tsx` | 90 |
| `apps/web/src/components/features/tasks/task-detail-panel.tsx` | 180 |
| `apps/web/src/components/features/tasks/task-timer-section.tsx` | 102 |
| `apps/web/src/components/features/tasks/create-task-dialog.tsx` | 140 |
| `packages/api-app/src/schemas/task-schema.ts` | 51 |
| `packages/api-app/src/utils/project-access.ts` | 57 |

---

## Security: Auth/Authz — VERIFIED OK

- `workspaceId` sourced exclusively from `session.session.activeOrganizationId` in `app.ts` middleware — never from query param or body. Confirmed across all routes.
- Timer `/stop`: filters by `(userId, workspaceId, endedAt IS NULL)` — no spoofing possible.
- Task operations: all mutating routes apply `AND workspace_id = ?` in WHERE clause.
- Template spawn: verifies template.workspaceId matches session workspaceId before spawning.
- Project/goal/sprint cross-workspace leakage: blocked via `projectBelongsToWorkspace` / `goalBelongsToWorkspace` / `sprintBelongsToWorkspace` helpers.

---

## Critical Issues

### 1. `POST /tasks/:id/complete` — non-atomic timer stop + task update

**Location:** `packages/api-app/src/routes/tasks.ts` lines 199–218

The two DB writes run in separate statements with no transaction:

```ts
// Step 1 — stops ALL open time logs for this taskId (no userId filter)
await db.update(timeLogs)
  .set({ endedAt: now, duration: ... })
  .where(and(eq(timeLogs.taskId, id), isNull(timeLogs.endedAt)));

// Step 2 — updates task (workspace-scoped)
const [updated] = await db.update(tasks)...
```

Two distinct bugs here:

**1a. Timer logs stopped for any user's timer on this task, not just the caller's.**  
If User B has a timer running on the same task and User A (same workspace) clicks "Mark done", User B's open time log gets force-stopped without their knowledge. The time log will be closed with whatever elapsed time, and the `timeSpent` counter on the task will NOT be updated (the stop code path that increments `time_spent` is in `/stop`, not in the complete endpoint). This creates a stopped time log with no corresponding `time_spent` update.

**1b. Non-atomic: timer log stopped even when task update fails.**  
If the task is not found (wrong workspace, already deleted), `updated` is null and a 404 is returned — but the timer stop in step 1 has already committed. The caller's (or any user's) active timer for that task is killed silently.

**Fix:** Wrap in a transaction, add `userId` filter to the timeLogs update, and update `timeSpent` in the same operation.

```ts
await db.transaction(async (tx) => {
  const userId = c.get('userId');
  const [activeLog] = await tx.select()
    .from(timeLogs)
    .where(and(eq(timeLogs.taskId, id), eq(timeLogs.userId, userId), isNull(timeLogs.endedAt)))
    .limit(1);

  if (activeLog) {
    const duration = Math.floor((now.getTime() - activeLog.startedAt.getTime()) / 1000);
    await tx.update(timeLogs).set({ endedAt: now, duration }).where(eq(timeLogs.id, activeLog.id));
    await tx.update(tasks).set({ timeSpent: sql`time_spent + ${duration}` }).where(eq(tasks.id, id));
  }

  const [updated] = await tx.update(tasks)
    .set({ status: 'done', completedAt: now, updatedAt: now })
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
    .returning();
  if (!updated) throw new Error('not_found');
});
```

---

## High Priority

### 2. `syncFromDb()` is defined but never called

**Location:** `apps/web/src/stores/useTimerStore.ts` line 69

The function exists in the store interface and implementation but has no call site anywhere in the codebase. This means on page refresh or session restore, the timer state is only restored from localStorage — it is NOT reconciled against the DB. If the server stopped a timer (e.g. via complete endpoint, or another device), the client will still show the timer running indefinitely.

Additionally, the function calls `/api/time-logs?limit=1` but the GET /time-logs route does not accept or honor a `limit` query param, so it returns all workspace time logs sorted by `startedAt DESC`. This is a full table scan without limit for the workspace, and the function must search the full result for `endedAt == null`. On heavy use this is an O(n) fetch for a single status check.

**Fix:** Call `syncFromDb()` on app mount (e.g. in the shell layout's `useEffect`), and add `limit` + `activeOnly` query support to GET /time-logs, or add a dedicated GET /time-logs/active endpoint.

### 3. Manual time log POST — no input validation on dates or duration

**Location:** `packages/api-app/src/routes/time-logs.ts` lines 114–150

```ts
const { taskId, startedAt, endedAt, duration, note } = body;
// ...
startedAt: new Date(startedAt),  // Invalid Date if non-date string
endedAt: new Date(endedAt),
duration: Number(duration),       // NaN if non-numeric
```

- `new Date("not-a-date")` produces an Invalid Date that PostgreSQL will reject with an unhelpful 500.
- `Number("abc")` = `NaN`; this gets inserted as NULL for `duration` and would be added to `time_spent` as `time_spent + NaN` — in PostgreSQL this propagates as NULL, corrupting the counter.
- No range check: a caller can submit a negative duration or one spanning months, corrupting `timeSpent`.
- `note` is a raw text field with no length cap at the API layer.

**Fix:** Add a Zod schema for this endpoint (mirror the pattern used in `createTaskSchema`). Validate ISO datetime strings, positive integer duration, and add a reasonable note max length (e.g. 1000 chars).

### 4. `PATCH /task-templates/:id` — unvalidated body silently deactivates templates

**Location:** `packages/api-app/src/routes/task-templates.ts` lines 53–68

```ts
const body = await c.req.json();
.set({ isActive: Boolean(body.isActive), updatedAt: new Date() })
```

If the request body is `{}` or omits `isActive`, `Boolean(undefined)` = `false`, and the template is permanently deactivated without the caller intending it. A frontend bug (sending the wrong payload shape) would silently break all recurring task spawning.

**Fix:** Validate with zValidator and make `isActive` required:

```ts
const patchTemplateSchema = z.object({ isActive: z.boolean() });
app.patch('/:id', zValidator('json', patchTemplateSchema), ...)
```

### 5. Timer start — TOCTOU race condition

**Location:** `packages/api-app/src/routes/time-logs.ts` lines 24–47

The active timer check (SELECT) and the insert are two separate queries with no DB-level guard:

```
Thread A: SELECT active → none → (context switch)
Thread B: SELECT active → none → INSERT
Thread A: INSERT   ← now two active timers exist for the same user
```

No unique partial index exists on `(userId) WHERE ended_at IS NULL`.

In practice this is low probability (single user, same browser), but concurrent tabs or a retry storm could trigger it.

**Fix:** Add a DB-level unique partial index:

```sql
CREATE UNIQUE INDEX time_logs_one_active_per_user
  ON time_logs (user_id) WHERE ended_at IS NULL;
```

Then the second insert fails with a unique violation, which the route can catch and return 409.

---

## Medium Priority

### 6. `GET /tasks` — `limit`/`offset` not sanitized

**Location:** `packages/api-app/src/routes/tasks.ts` line 44-45

```ts
.limit(parseInt(limit, 10))
.offset(parseInt(offset, 10))
```

`parseInt('abc', 10)` = `NaN`. Drizzle will either throw or pass NaN to the driver. A caller sending `?limit=drop` gets a 500 instead of a 400. Clamp to safe values:

```ts
const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
const off = Math.max(parseInt(offset, 10) || 0, 0);
```

### 7. `GET /tasks` — `status` query param not validated

**Location:** `packages/api-app/src/routes/tasks.ts` line 37

```ts
if (status) conditions.push(eq(tasks.status, status as any));
```

The status value is passed through without enum validation. Any string is accepted, which will produce an empty result set rather than a 400 — silently hiding filter typos. This is low security risk (workspace-scoped), but a mis-typed status returns zero results with no error, confusing callers.

**Fix:** Check `['backlog','todo','in_progress','blocked','in_review','done'].includes(status)` before appending.

### 8. `GET /tasks` — `count` in response reflects only current page

**Location:** `packages/api-app/src/routes/tasks.ts` line 47

```ts
return c.json({ success: true, data: allTasks, count: allTasks.length });
```

`count` is the length of the returned page, not the total matching rows. Callers cannot implement accurate pagination without a total count. Either rename to `pageSize` or add a `total` field via a separate COUNT query (or window function).

### 9. Frontend spawn effect — stale task list could miss already-spawned tasks

**Location:** `apps/web/src/app/dashboard/tasks/page.tsx` lines 60–77

The `alreadySpawned` check runs against `tasks` from `useTasks(apiFilters)`, which is filtered by the user's current status and search filters. If a recurring task was spawned earlier but the user has a status filter active, `tasks` won't include it, so `alreadySpawned = false` and a spawn request fires. The server-side `ON CONFLICT DO NOTHING` catches this correctly, so there is no data duplication — but it produces unnecessary network requests on every mount when filters are active.

**Fix:** Fetch templates + spawned check against an unfiltered task list (only filter by `recurringTemplateId IS NOT NULL AND start_date = today`), or rely solely on the server-side idempotency without the client-side check.

---

## Low Priority / Informational

### 10. `console.warn` in production code

**Location:** `apps/web/src/components/features/tasks/kanban-board.tsx` line 61

```ts
console.warn("Timer conflict:", result.error)
```

Project rules prohibit `console.*` in production code. Timer conflict is already surfaced to the user via the 409 response and the "stop timer first" warning in TaskTimerSection. Remove this or replace with a proper toast notification.

### 11. Missing index: `(userId, endedAt)` on `time_logs`

The start/stop hot paths query `WHERE user_id = ? AND ended_at IS NULL`. Only a single-column `userIdx` on `user_id` exists. PostgreSQL will use it, but adding a partial index `WHERE ended_at IS NULL` would make these lookups significantly faster as time logs accumulate.

### 12. Legacy `@ts-nocheck` files still imported by v1 components

`apps/web/src/components/Sidebar.tsx` imports `TimerWidget` and `apps/web/src/components/KanbanBoard.tsx` / `KanbanColumn.tsx` import `TaskCard` (the v1 @ts-nocheck versions). These v1 wrapper components are not imported by any page, so there is no production impact. Cleanup is tracked for Phase 05 — no action needed now.

### 13. `useTimerStore` persists `elapsedSeconds` to localStorage

**Location:** `apps/web/src/stores/useTimerStore.ts` lines 100–107

`elapsedSeconds` is included in the persisted state. On restore, the value is stale relative to actual elapsed time (startTime is persisted correctly, so elapsed is recomputed by `tick`). This is harmless since `tick()` overwrites it on the next interval, but persisting it is unnecessary overhead. Remove `elapsedSeconds` from `partialize`.

---

## Positive Observations

- `workspaceId` isolation is consistently enforced at every route — no leakage found.
- `POST /time-logs/stop` correctly scopes by both `userId` and `workspaceId` — no timer spoofing.
- Idempotent template spawn via `ON CONFLICT DO NOTHING` + DB unique index is the right pattern; server-side guard is robust even when client check is unreliable.
- `moveTaskSchema` zod validation for PATCH /move is clean; status enum is enforced server-side.
- `projectBelongsToWorkspace` utility correctly short-circuits on invalid UUIDs before hitting the DB.
- Optimistic drag with `mutate()` rollback on failure is correctly wired.
- `createTaskSchema` date refinement (`dueDate >= startDate`) is a good guard.
- Rate limiting on integration sync/authorize routes shows security awareness.
- `isPublicApiPath` allowlist is explicit and tight — no over-permissive patterns.
- `getClientIp` uses last XFF segment (real IP, not spoofable) — correct.

---

## Required Actions (prioritized)

1. **(Blocking)** Wrap `POST /tasks/:id/complete` in a DB transaction, add `userId` filter to timeLogs update, and update `timeSpent` in the same transaction.
2. **(Blocking)** Add Zod validation to `POST /time-logs` (manual entry) — validate ISO dates, positive int duration, note max length.
3. **(High)** Add `zValidator` to `PATCH /task-templates/:id` with `isActive: z.boolean()` required.
4. **(High)** Call `syncFromDb()` on app shell mount to reconcile client timer state with DB.
5. **(High)** Fix GET /time-logs to support `limit`/active-only filtering so `syncFromDb` is efficient.
6. **(Medium)** Sanitize `limit`/`offset` in GET /tasks — clamp to valid int range.
7. **(Medium)** Validate `status` query param against enum in GET /tasks.
8. **(Low)** Add partial unique index `ON time_logs (user_id) WHERE ended_at IS NULL` to enforce single active timer at DB level.
9. **(Low)** Remove `console.warn` from `kanban-board.tsx`.

---

## Unresolved Questions

- Is the `complete` endpoint intended to stop timers for ALL users running time on that task, or only the caller's? Current behavior stops any open timer on the task (across users). Likely a bug but needs product clarification if this is a collaborative workspace.
- Should `GET /tasks` return a total count alongside the page for pagination support? The current `count` field is misleading.
- Is `syncFromDb` deliberately deferred to Phase 05, or was the call site accidentally omitted?
