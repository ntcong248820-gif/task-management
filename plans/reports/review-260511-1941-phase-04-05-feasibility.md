---
title: "Phase 04-05 Feasibility Review — Task Management v2 + Goals/Sprints"
date: 2026-05-11
type: review
scope: Phase 04 (Task Management v2) + Phase 05 (Goals & Sprint Management)
context: v2 Greenfield Rebuild — plan 260510-1600-v2-greenfield-rebuild
skills: /ck:databases, /ck:backend-development
---

# Phase 04-05 Feasibility Review

## Executive Summary

Plans 04-05 are **structurally sound** with good KISS/YAGNI decisions. Architecture direction correct — single-page view switcher, projection-based rendering, DRY component reuse from Phase 03/04. However, both phases có **5 critical gaps** cần resolve trước khi implement để tránh rework và N+1 query bugs.

**Verdict:** ✅ Feasible — with targeted corrections below.

---

## Codebase Context (v1 Baseline)

| Layer | v1 State | Gap to v2 |
|-------|----------|-----------|
| tasks schema | 3 statuses, no workspace/user/sprint/goal FK, assignedTo as text | Significant — needs new columns + migration |
| API routes | Basic CRUD, no auth, no workspaceId scoping | All routes need auth middleware + workspace filter |
| Frontend | Single KanbanBoard (3 cols), dnd-kit, Zustand store | Rebuild — carry over dnd-kit and SWR pattern |
| Types | TaskStatus only 3 values, no Sprint/Goal types | Full extension needed |

---

## Section 1: Database Schema Review (`/ck:databases`)

### 1.1 ✅ Strengths

- **Composite indexes on gsc_data** (project_id, date, page, query, country, device) là good precedent — v2 cần follow tương tự cho tasks
- **ON DELETE CASCADE** pattern consistent
- **snake_case conversion enabled** in Drizzle — no breakage on new tables
- **JSONB for actualImpact** — appropriate for flexible metric payload

### 1.2 🔴 CRITICAL: Missing Index Definitions in Plan

Phase 04-05 plans không mention indexes. Based on query patterns:

```sql
-- tasks table — required composite indexes for v2
CREATE INDEX tasks_workspace_status_idx    ON tasks(workspace_id, status);
CREATE INDEX tasks_workspace_sprint_idx    ON tasks(workspace_id, sprint_id);
CREATE INDEX tasks_workspace_goal_idx      ON tasks(workspace_id, goal_id);
CREATE INDEX tasks_workspace_assignee_idx  ON tasks(workspace_id, assignee_id);
CREATE INDEX tasks_workspace_due_date_idx  ON tasks(workspace_id, due_date);
-- Calendar view: date range queries
CREATE INDEX tasks_due_date_idx            ON tasks(due_date) WHERE due_date IS NOT NULL;

-- goals table
CREATE INDEX goals_workspace_status_idx    ON goals(workspace_id, status);
CREATE INDEX goals_workspace_project_idx   ON goals(workspace_id, project_id);

-- sprints table
CREATE INDEX sprints_workspace_goal_idx    ON sprints(workspace_id, goal_id);
CREATE INDEX sprints_workspace_status_idx  ON sprints(workspace_id, status);

-- task_templates table
CREATE INDEX templates_workspace_idx       ON task_templates(workspace_id);
```

**Drizzle pattern** (existing project uses this):
```ts
// In schema file
export const tasksWorkspaceStatusIdx = index('tasks_workspace_status_idx')
  .on(tasks.workspaceId, tasks.status);
```

### 1.3 🔴 CRITICAL: status column type — text vs pgEnum

v1 dùng `text + CHECK constraint`. v2 mở rộng status từ 3 → 7 values.

**Recommendation**: Keep `text + CHECK` (không dùng PostgreSQL native ENUM) vì:
- PostgreSQL ENUM type requires `ALTER TYPE` to add values — không transactional trong migration
- Drizzle `pgEnum` wraps native ENUM — same issue
- Text + check constraint dễ migrate hơn

**Action**: Phase 02 schema file cần define check constraint rõ ràng:
```ts
// In phase-02 schema
taskStatus: text('status').notNull().default('backlog')
  .$type<'backlog'|'todo'|'in_progress'|'blocked'|'in_review'|'done'|'cancelled'>()
```

### 1.4 🟡 WARNING: assignedTo → assigneeId migration

v1: `assignedTo text` (stores name string, no FK)
v2: `assigneeId integer` (FK → users from Better Auth)

**Migration risk**: Existing data has text names, not user IDs. Plan says "reset" schema nhưng không clarify data migration.

**Decision needed**: 
- Fresh DB (no data migration) → simply rename/replace column ✅
- Preserve existing tasks → need migration script matching names to user IDs

**Recommendation**: Add both columns temporarily (`assignedTo` kept nullable, `assigneeId` added), backfill where possible, then drop old column in subsequent migration.

### 1.5 🟡 WARNING: sprints.goalId cardinality

Plan says "sprints linked to goals (nullable?)" — cần clarify:
- `goalId nullable` → sprint can exist independently (standalone sprint)
- `goalId NOT NULL` → every sprint must belong to a goal

**Recommendation**: Make `goalId` nullable. Allows sprint-only planning without requiring goal hierarchy. Aligns with KISS.

```ts
goalId: integer('goal_id').references(() => goals.id, { onDelete: 'set null' })
```

### 1.6 ✅ tasks FK delete strategy

```ts
// Correct cascade strategy
sprintId: integer('sprint_id').references(() => sprints.id, { onDelete: 'set null' })
goalId:   integer('goal_id').references(() => goals.id, { onDelete: 'set null' })
assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' })
```

Không dùng CASCADE delete cho sprint/goal → tasks không bị xóa khi sprint/goal bị xóa.

### 1.7 🟡 goals.targetValue column type

Plan không specify type. 

**Recommendation**: `numeric(12,4)` — supports both percentage (0.40) and absolute values (5000 sessions), với unit column clar ify meaning.

---

## Section 2: Backend API Review (`/ck:backend-development`)

### 2.1 🔴 CRITICAL: workspaceId security — must come from auth session

Phase 04 plan lists `workspaceId` as query filter:
```
GET /api/tasks?workspaceId=X&projectId=Y
```

**This is a security flaw.** workspaceId passed by client can be forged to access other workspaces' data.

**Correct pattern** (Hono with Better Auth):
```ts
// Middleware extracts workspaceId from validated session
app.get('/api/tasks', authMiddleware, async (c) => {
  const session = c.get('session'); // set by Phase 01 middleware
  const workspaceId = session.user.workspaceId; // extracted from auth, not query param
  const { projectId, sprintId, status } = c.req.query();
  // ...
})
```

**Action**: Remove `workspaceId` from documented query params. All filtering is workspace-scoped via session.

### 2.2 🔴 CRITICAL: N+1 query in getGoalProgress()

Phase 05 plan shows:
```ts
async function getGoalProgress(goalId: number) {
  const tasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
  // ...
}
```

Nếu GoalsPage gọi `getGoalProgress()` cho từng GoalCard → **N+1 queries** (1 query goals list + N queries per goal).

**Fix**: Single aggregated query for all goals in workspace:
```ts
// Single query with groupBy — replace N+1 with 1 query
const progress = await db
  .select({
    goalId: tasks.goalId,
    tasksTotal: count(),
    tasksDone: count(
      sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`
    ),
  })
  .from(tasks)
  .where(inArray(tasks.goalId, goalIds))
  .groupBy(tasks.goalId);
```

**Action**: `GET /api/goals` should return progress inline (not via separate endpoint per goal) when listing. Keep `GET /api/goals/:id/progress` for detail view only.

### 2.3 🟡 WARNING: Pagination not specified

`GET /api/tasks` có thể return hàng trăm tasks với large workspace. Plan không mention pagination.

**Recommendation**: Add minimal pagination — limit/offset is sufficient (no cursor needed for this scale):
```ts
GET /api/tasks?limit=50&offset=0
```

Return:
```json
{ "success": true, "data": [...], "total": 234, "limit": 50, "offset": 0 }
```

Consistent với existing `PaginatedResponse<T>` type trong packages/types.

### 2.4 🟡 WARNING: Sprint state machine — missing guards

Phase 05 plan defines:
```
POST /api/sprints/:id/start    — set status=active
POST /api/sprints/:id/complete — set status=completed
```

Không có guard conditions. Cần:
```ts
// start: only from 'planning'
if (sprint.status !== 'planning') throw 400 'Sprint must be in planning state'

// complete: only from 'active'  
if (sprint.status !== 'active') throw 400 'Sprint must be active to complete'

// complete: handle undone tasks?
const undoneTasks = await db.count().from(tasks)
  .where(and(eq(tasks.sprintId, id), ne(tasks.status, 'done')));
// → either warn (return count), or auto-move to backlog
```

**Recommendation**: Return `{ warning: "X tasks not completed" }` instead of blocking — let user decide.

### 2.5 ✅ Time-log start/stop pattern — correct, but needs active-timer guard

Plan: `POST /api/time-logs/start` + `POST /api/time-logs/stop`

Good design. But cần handle:
```ts
// Check for existing active timer before starting new one
const activeLog = await db.select().from(timeLogs)
  .where(and(eq(timeLogs.taskId, taskId), isNull(timeLogs.endTime)));
if (activeLog.length > 0) throw 409 'Timer already running for this task'
```

### 2.6 ✅ Recurring template spawn strategy — CLARIFY

Plan says "lazy spawn — check on page load, create any overdue template instances" as alternative to cron.

**Recommendation**: Implement lazy spawn as MVP, upgrade to cron in Phase 06+. Lazy spawn is simpler and sufficient for small teams.

Guard against race conditions:
```ts
// Idempotent check before spawning
const today = new Date().toISOString().split('T')[0];
const existing = await db.select().from(tasks)
  .where(and(
    eq(tasks.templateId, templateId),
    eq(tasks.templateSpawnDate, today)
  ));
if (existing.length > 0) return; // already spawned today
```

**Action**: Add `templateId` + `templateSpawnDate` columns to tasks table (not in Phase 04 plan currently).

### 2.7 ✅ GET /api/tasks/stats — good endpoint, but define response shape

Plan mentions this endpoint for workload view but doesn't specify response:
```ts
// Recommended response shape
{
  "byStatus": { "backlog": 5, "todo": 3, "in_progress": 8, ... },
  "byAssignee": [
    { "assigneeId": 1, "name": "Alice", "taskCount": 8, "estimatedHours": 40 }
  ]
}
```

### 2.8 🟡 WARNING: Zod schemas for new fields

Phase 04 plan says "rewrite Zod schemas in task-schema.ts" nhưng không detail new fields.

Cần add:
```ts
const createTaskSchema = z.object({
  // existing
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  // v2 new
  assigneeId: z.number().int().positive().optional(),
  sprintId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  startDate: z.string().date().optional(), // ISO date string
  dueDate: z.string().date().optional(),
  affectsWebsite: z.boolean().default(false),
  // validation: dueDate >= startDate
}).refine(data => {
  if (data.startDate && data.dueDate) return data.dueDate >= data.startDate;
  return true;
}, { message: 'dueDate must be >= startDate', path: ['dueDate'] });
```

---

## Section 3: Frontend Architecture Review

### 3.1 ✅ Single-page view switcher — correct pattern

```tsx
// tasks/page.tsx — server component reads searchParams
export default async function TasksPage({ searchParams }) {
  const view = (await searchParams).view ?? 'board'
  // ...
}
```

**Note**: In Next.js 15, `searchParams` is async (Promise). Plan's pseudocode needs update:
```tsx
// Correct Next.js 15 pattern
const view = (await searchParams).view ?? 'board'
```

View switching via `<Link href="?view=timeline">` (no page reload in App Router with Suspense).

### 3.2 ✅ TanStack Table for Table view — correct choice

v8 stable, tree-shakeable, works well with SWR data. Good choice.

### 3.3 🟡 WARNING: Timeline view — commit to CSS Grid

Plan says "gantt-task-react or build simple with CSS grid" — undecided.

**Recommendation**: CSS Grid (KISS). gantt-task-react adds ~45KB, opinionated styles, harder to customize. A Gantt-lite for a 5-person team doesn't need a full library.

Simple CSS Grid approach:
```tsx
// Each row = task, each cell = day
// task bar: grid-column-start = dayOffset, grid-column-end = dayOffset + duration
const dayOffset = differenceInDays(task.startDate, rangeStart) + 1;
const duration = differenceInDays(task.dueDate, task.startDate) + 1;
style={{ gridColumn: `${dayOffset} / span ${duration}` }}
```

### 3.4 🟡 WARNING: Timer store — single active timer vs multi-timer

Phase 04 mentions "rewrite timer-store.ts" but doesn't specify:
- Single active timer per user (simpler) 
- Multiple timers per task (complex)

**Recommendation**: Single active timer. Only one task tracked at a time. Store: `{ activeTaskId, startTime, elapsed }`. Persist to localStorage for page refresh.

### 3.5 ✅ Task detail slide-over — right call

Modal → slide-over: correct UX decision. Doesn't interrupt board layout. Supports inline edits.

### 3.6 🟡 WARNING: useTasks(filters) — specify cache key strategy

For view switching without re-fetch, SWR key must be stable across view changes:
```ts
// Cache key: stable JSON of filters (not view)
const key = filters ? `/api/tasks?${new URLSearchParams(filters)}` : null;
const { data } = useSWR(key, fetcher);
```

View switcher changes URL param (`?view=`) but NOT the SWR key → data is cached ✅.

---

## Section 4: Feasibility Assessment

### Effort Estimate Validation

| Phase | Plan Estimate | Assessment | Notes |
|-------|--------------|------------|-------|
| Phase 04 (~20h) | Board + Timeline + Table + Calendar + Templates + API + Hooks | ✅ Tight but achievable | Carry over dnd-kit from v1, SWR pattern established |
| Phase 05 (~10h) | Goals + Sprints + Workload + API + Hooks + UI integration | ✅ Realistic | Reuses Phase 04 task components |

**Risk factors:**
- Timeline view CSS Grid implementation: +2-3h if under-estimated
- Auth middleware integration: Phase 01 must be done first (hard dependency)
- Schema migration: If existing data kept, +2-4h for migration scripts

### Phase Ordering ✅

Dependency chain is correct:
- Phase 01 → Phase 02 → Phase 04 → Phase 05
- Phase 03 delivers UI shell, needed before Phase 04 views

---

## Section 5: Issues Summary

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | 🔴 Critical | Phase 04 API | workspaceId in query param (security) | Extract from auth session only |
| 2 | 🔴 Critical | Phase 05 API | N+1 in getGoalProgress() per goal | Batch query with groupBy |
| 3 | 🔴 Critical | Phase 04 Schema | Missing indexes for new FK + filter columns | Add 9 composite indexes |
| 4 | 🟡 Warning | Phase 04 Schema | templateId + templateSpawnDate not in tasks table | Add columns to task_templates linkage |
| 5 | 🟡 Warning | Phase 05 API | Sprint state transition — no guards | Add status precondition checks |
| 6 | 🟡 Warning | Phase 04 API | No pagination on GET /api/tasks | Add limit/offset |
| 7 | 🟡 Warning | Phase 04 Schema | assignedTo → assigneeId migration not planned | Decide: fresh DB or backfill script |
| 8 | 🟡 Warning | Phase 04 Frontend | Next.js 15 searchParams is async | Await searchParams |
| 9 | 🟡 Warning | Phase 04 Frontend | Timeline library undecided | Commit to CSS Grid |
| 10 | 🟡 Warning | Phase 04 Frontend | Timer store design not specified | Single active timer, persist localStorage |

---

## Section 6: Recommendations

### For Phase 04 plan — add these to Todo list:

```
- [ ] Add workspaceId extraction from auth session in ALL route handlers (not query param)
- [ ] Define 5 composite indexes for tasks table in Phase 02 schema
- [ ] Add templateId + templateSpawnDate columns to tasks table schema
- [ ] Add pagination (limit/offset) to GET /api/tasks response
- [ ] Await searchParams in page.tsx (Next.js 15 async)
- [ ] Commit to CSS Grid for Timeline view (remove gantt-task-react option)
- [ ] Specify timer store: single active timer, localStorage persistence
```

### For Phase 05 plan — add these to Todo list:

```
- [ ] Add 3 composite indexes for goals + sprints tables in Phase 02 schema
- [ ] Fix getGoalProgress() to batch query (1 SQL with groupBy, not N queries)
- [ ] Add state machine guards to POST /api/sprints/:id/start and /complete
- [ ] Make goalId in sprints nullable with ON DELETE SET NULL
- [ ] Define goals.targetValue as numeric(12,4) in Phase 02 schema
- [ ] GET /api/goals list response should include inline progress (count) to avoid N+1 in UI
```

### For Phase 02 (schema) — consolidate all indexes there:

All indexes for tasks_v2, goals, sprints, task_templates should be defined in Phase 02 schema, not discovered during Phase 04-05 implementation.

---

## Unresolved Questions

1. **assignedTo migration**: Fresh DB start hay preserve v1 task data? → Cần confirm với user trước Phase 02 implementation.

2. **Workspace-level vs Project-level goals**: Goals hiện scoped to (workspaceId + projectId). Có goals nào là workspace-wide (không tied to specific project) không? → Affects schema cardinality.

3. **Sprint without goal**: Plan implies sprints are tied to goals, nhưng sprint table has `goalId nullable`. Should UI allow creating standalone sprints? → UX decision.

4. **Multiple active sprints**: Can a workspace have multiple active sprints simultaneously (e.g., different projects)? → Affects sprint board filtering logic.

5. **task_templates spawn: who triggers lazy spawn?** On TasksPage mount? Or GoalsPage mount? → Need clear trigger point to avoid double-spawn.
