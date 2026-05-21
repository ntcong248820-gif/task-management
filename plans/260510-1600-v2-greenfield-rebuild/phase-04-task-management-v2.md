---
phase: 4
title: "Task Management v2 — Multi-View System"
status: complete
priority: P1
effort: "~20h"
dependencies: [1, 2, 3]
---

> **Completed 2026-05-22.** Type-check clean, 21/21 unit tests pass, code-reviewed READY_WITH_CONCERNS (all blocking issues fixed). V1 legacy files (@ts-nocheck) deferred to Phase 05 cleanup.

# Phase 04: Task Management v2

## Overview

Rebuild task management từ basic Kanban thành multi-view system.
Core insight từ research: **cùng một dataset, nhiều rendering modes** — không duplicate data.

> **Architecture note (from Phase 03 review):** Task views are **NOT separate pages**.
> All views live inside a single `tasks/page.tsx`, switching via `?view=board|timeline|table|calendar` URL search param.
> This prevents full page reload on view switch and keeps sidebar state stable.

## View Priority (from research)

1. **Board (Kanban)** — Daily work dispatch
2. **Timeline (Gantt-lite)** — Campaign dependencies, content calendar
3. **Table (Spreadsheet)** — Bulk edit, reporting
4. **Calendar** — Publication schedule, deadline view

## Task Status Flow (Extended)

```
backlog → todo → in_progress → blocked → in_review → done
                     ↓
                  (cancelled)
```

## Architecture: View-as-Projection

Tất cả views query cùng một `tasks` table, khác nhau ở rendering:

```
API: GET /api/tasks?workspaceId=X&projectId=Y&sprintId=Z&...filters
                        ↓
              Same data, same endpoint
                        ↓
      Board View    Timeline View    Table View    Calendar View
   (group by status) (sort by date) (flat list)  (group by date)
```

## Backend API

### Tasks Routes (`packages/api-app/src/routes/tasks.ts`)

```
GET    /api/tasks              — list (filter: workspaceId, projectId, sprintId, assigneeId, status, dateRange, search?)
                               — search: ILIKE on title+tags; used by Phase 07 keyword→task + page→task linking
POST   /api/tasks              — create
GET    /api/tasks/:id          — get single
PUT    /api/tasks/:id          — update
DELETE /api/tasks/:id          — delete (soft delete)
POST   /api/tasks/:id/complete — mark done, set completedAt
                               — ⚠️ MUST also auto-stop active timer:
                                  UPDATE time_logs SET ended_at=NOW(), duration=EXTRACT(EPOCH FROM NOW()-started_at)
                                  WHERE task_id=$id AND ended_at IS NULL
PATCH  /api/tasks/:id/move     — move status (drag & drop)
                               — ⚠️ If new status ≠ 'done': SET completed_at = NULL (clear stale completedAt)
                               — ⚠️ Client must rollback optimistic update if API fails (SWR mutate on error)
GET    /api/tasks/stats        — count by status, assignee (for workload view)
```

### Time Logs Routes (`packages/api-app/src/routes/time-logs.ts`)

```
POST   /api/time-logs/start    — start timer for task
POST   /api/time-logs/stop     — stop timer, save duration
GET    /api/tasks/:id/time-logs — list logs for task
```

### Task Templates Routes (NEW)

```
GET    /api/task-templates     — list recurring templates
POST   /api/task-templates     — create template
POST   /api/task-templates/:id/spawn — spawn task from template now
```

## Frontend Components

### Tasks Page — Single Route, View Switcher

```
/dashboard/tasks?view=board      ← default
/dashboard/tasks?view=timeline
/dashboard/tasks?view=table
/dashboard/tasks?view=calendar
```

```tsx
// apps/web/src/app/(app)/dashboard/tasks/page.tsx
// ⚠️ Next.js 15: searchParams is async — must await before accessing properties
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'board' } = await searchParams
  return (
    <>
      <ViewSwitcherTabs active={view} />  {/* Board | Timeline | Table | Calendar */}
      <TaskFiltersBar />
      {view === 'board' && <BoardView />}
      {view === 'timeline' && <TimelineView />}
      {view === 'table' && <TableView />}
      {view === 'calendar' && <CalendarView />}
    </>
  )
}
```

View switch updates URL param only — no full page reload, no sidebar flicker, shared filter state.

### Board View

```
BoardView
  ├── TaskFiltersBar (status, assignee, priority, type, sprint)
  ├── CreateTaskButton
  └── KanbanBoard
      ├── KanbanColumn (status: backlog)
      ├── KanbanColumn (status: todo)
      ├── KanbanColumn (status: in_progress)
      ├── KanbanColumn (status: blocked)
      ├── KanbanColumn (status: in_review)
      └── KanbanColumn (status: done)
          └── TaskCard (each task)
              ├── Title, priority badge, type badge
              ├── Assignee avatar
              ├── Due date (color: red if overdue)
              ├── Time spent / estimated
              └── Quick actions: timer start/stop, move status
```

**Key behaviors:**
- Drag & drop between columns (`@dnd-kit`, carry over from v1)
- Click task → slide-over panel (not modal) for full detail
- Inline status change on TaskCard
- Timer button on card: start/stop time tracking

### Task Detail Slide-Over

```
TaskDetailPanel (right side slide-over)
  ├── Title (editable inline)
  ├── Status select, Priority select, Type select
  ├── Assignee select (workspace members; internal MVP may only have current user until invite email returns)
  ├── Sprint select, Goal select
  ├── Start date / Due date
  ├── affectsWebsite toggle
  ├── Description (rich text — keep simple, textarea ok)
  ├── Tags
  ├── Time tracking section
  │   ├── Total time spent / estimated
  │   │     ⚠️ Guard: estimatedTime=0 → show "—" not "0%", avoid division-by-zero
  │   ├── Timer (start/pause/stop)
  │   │     ⚠️ If another task timer is active → show toast "Stop [task X] timer first"
  │   │     — DB-backed: active timer = time_logs row WHERE ended_at IS NULL for this user
  │   └── Manual time log
  └── Activity log (created, status changes)
```

### Timeline View (`?view=timeline`)

Gantt-lite: show tasks as horizontal bars on a date axis.

```
TimelineView
  ├── DateRangeSelector (week / month / quarter)
  ├── GroupBySelector (sprint / assignee / type)
  └── GanttChart
      ├── Row headers (task names, assignees)
      └── Timeline grid
          ├── DateHeader (days/weeks)
          └── TaskBar (startDate → dueDate, color by status)
              └── Tooltip: title, assignee, time spent
```

**Note**: Không cần full Gantt dependencies (YAGNI). Chỉ cần show bars by date range.
Suggest `gantt-task-react` or build simple with CSS grid.

### Table View (`?view=table`)

Spreadsheet-like: editable cells, sortable columns, bulk operations.

```
TableView
  ├── ColumnVisibilityToggle (show/hide columns)
  ├── SortControls
  ├── FilterBar
  └── DataTable (TanStack Table)
      └── Columns: title, status, priority, type, assignee, 
                   sprint, dueDate, timeSpent, affectsWebsite
```

Each cell: click-to-edit inline. Row checkbox: bulk status change, bulk assign.

### Calendar View (`?view=calendar`)

Simple month calendar, tasks displayed on their due date.

```
CalendarView
  ├── MonthNavigator
  └── CalendarGrid
      └── DayCell
          ├── TaskChip (title, color by type) — show max 3
          └── "+N more" chip → popover with full list
              ⚠️ Guard: day with 20+ tasks must not overflow cell height
```

Click task chip → open TaskDetailPanel.

### Recurring Task Templates

- Settings page: manage templates
- Template: defines title, type, frequency (daily/weekly/monthly), due day
- **Lazy spawn** (MVP): check on TasksPage mount, create overdue template instances
- Idempotent guard: use existing `recurringTemplateId + startDate` columns (Phase 02 schema) — no new column needed
  ```sql
  INSERT INTO tasks (...) VALUES (...)
  ON CONFLICT (recurring_template_id, start_date) DO NOTHING
  -- ⚠️ Requires UNIQUE constraint on (recurring_template_id, start_date) in schema
  -- Prevents duplicate spawn when user opens 2 tabs simultaneously
  ```

## Data Hooks (SWR)

```ts
// apps/web/src/hooks/use-tasks.ts
useTasks(filters)         → { tasks, loading, mutate }
useTask(id)               → { task, loading, mutate }
useTaskStats()            → { countByStatus, countByAssignee }
useTaskTemplates()        → { templates, loading }
```

## Related Code Files

**Create:**
- `packages/api-app/src/routes/tasks.ts` (rewrite)
- `packages/api-app/src/routes/time-logs.ts` (rewrite)
- `packages/api-app/src/routes/task-templates.ts` (new)
- `packages/api-app/src/schemas/task-schema.ts` (rewrite)
- `apps/web/src/app/(app)/dashboard/tasks/page.tsx` (single page — all views via ?view= param)
- `apps/web/src/components/features/tasks/view-switcher-tabs.tsx` (Board/Timeline/Table/Calendar tabs)
- `apps/web/src/components/features/tasks/kanban-board.tsx`
- `apps/web/src/components/features/tasks/kanban-column.tsx`
- `apps/web/src/components/features/tasks/task-card.tsx`
- `apps/web/src/components/features/tasks/task-detail-panel.tsx`
- `apps/web/src/components/features/tasks/timeline-view.tsx`
- `apps/web/src/components/features/tasks/table-view.tsx`
- `apps/web/src/components/features/tasks/calendar-view.tsx`
- `apps/web/src/components/features/tasks/task-filters-bar.tsx`
- `apps/web/src/hooks/use-tasks.ts`
- `apps/web/src/stores/timer-store.ts` (rewrite)

## Decisions (confirmed 2026-05-11)

- **Fresh DB** — no v1 data migration. Schema reset completely.
  - Note: Preserve learnings from v1 GSC sync (3-day delay, aggregated vs raw, site selection) — apply in Phase 06 cron rewrites.
- **assignedTo (text) → assigneeId (int FK)** — simply replace, no backfill needed.
- **Lazy template spawn trigger**: TasksPage mount — most frequently visited page.
  - Idempotent check: `recurringTemplateId + startDate` from Phase 02 tasks schema — no extra column needed.
- **Timeline view**: CSS Grid only (no gantt-task-react dependency). KISS.
- **Timer store**: Single active timer per user. Persist to localStorage for page refresh.
- **workspaceId**: Extract from auth session ONLY — never from query param (security).
- **Pagination**: Add `limit=50&offset=0` to `GET /api/tasks` response.
- **`targetUrl` field**: Add `targetUrl TEXT NULL` to tasks via Phase 04 migration (not in Phase 02 schema). Used by Phase 07 to link tasks to specific pages in the Pages Deep Dive panel.
- **`search` filter**: `GET /api/tasks?search=X` — ILIKE on `title` + `tags` array. Used by Phase 07 KeywordDetailPanel "Linked tasks" feature.

## Todo

- [x] **FIRST:** Install `@tanstack/react-table` — required for Table view (`npm install @tanstack/react-table -w apps/web`)
- [x] Add Phase 04 migration: `ALTER TABLE tasks ADD COLUMN target_url TEXT` (for Phase 07 page→task linking)
- [x] Add UNIQUE constraint on tasks `(recurring_template_id, start_date)` for idempotent spawn (delivered in Phase 02 schema)
- [x] Add `targetUrl` to Zod create/update schemas + TypeScript task type
- [x] Add `targetUrl` field to TaskDetailPanel UI (optional URL input — sanitize: only allow `https?://`)
- [x] Rewrite `tasks.ts` API route (all endpoints) — workspaceId from session, not query param
- [x] `POST /api/tasks/:id/complete`: auto-stop active timer (UPDATE time_logs SET ended_at=NOW() WHERE task_id=$id AND ended_at IS NULL)
- [x] `PATCH /api/tasks/:id/move`: clear completedAt when moving task OUT of 'done' status
- [x] Add `search` filter to GET /api/tasks (ILIKE on title + tags)
- [x] Rewrite `time-logs.ts` API route — DB-backed active timer: query `time_logs WHERE ended_at IS NULL AND user_id=$userId` before starting new timer
- [x] Create `task-templates.ts` API route — spawn with `INSERT...ON CONFLICT (recurring_template_id, start_date) DO NOTHING`
- [x] Rewrite Zod schemas in `task-schema.ts` — add assigneeId, sprintId, goalId, startDate, dueDate, affectsWebsite, targetUrl, `.refine(d => !d.dueDate || !d.startDate || d.dueDate >= d.startDate, "dueDate must be >= startDate")`
- [x] Add pagination (limit/offset) to GET /api/tasks
- [x] Build Board view (Kanban) — carry over @dnd-kit, add TouchSensor for mobile
- [x] Board: implement optimistic rollback in `onDragEnd` — call `mutate()` if API PATCH fails
- [x] Build TaskCard component
- [x] Build TaskDetailPanel (slide-over) — estimatedTime=0 guard in time progress display
- [x] Build Timeline view (CSS Grid) — add "no dates" empty state for tasks without startDate/dueDate
- [x] Build Table view (TanStack Table)
- [x] Build Calendar view — max 3 chips/day + "+N more" popover
- [x] Build TaskFiltersBar (shared across views)
- [x] Build view switcher (Board/Timeline/Table/Calendar tabs)
- [x] Build timer in TaskDetailPanel — show "Stop [task X] first" toast if another timer active
- [x] Build recurring task templates UI in settings
- [x] Write SWR hooks — stable cache key (filters only, not view param)
- [x] Spawn lazy template tasks on TasksPage mount (ON CONFLICT DO NOTHING)
- [x] Run `npm run type-check`

## Success Criteria

- [x] Can create task with all v2 fields (assignee, sprint, goal, dates)
- [x] Board: drag & drop changes status, persists
- [x] Timeline: tasks visible as bars between start/due dates
- [x] Table: inline edit works, sort + filter works
- [x] Calendar: tasks appear on due date
- [x] View switcher switches views without re-fetching data
- [x] Timer start/stop tracks time correctly
- [x] Recurring template spawns task at correct frequency
