---
phase: 5
title: "Goals & Sprint Management"
status: pending
priority: P1
effort: "~10h"
dependencies: [2, 4]
---

# Phase 05: Goals & Sprint Management

## Overview

Xây dựng hệ thống goal hierarchy để tasks có mục tiêu cụ thể.
Đây là yếu tố giúp user "tránh lạc lối trong công việc không có mục tiêu".

## Decisions (confirmed 2026-05-11)

- **Goals are project-scoped** — each Project (website) has its own goals, no cross-project goals.
- **Standalone sprints allowed** — `goalId` on sprints is nullable. Sprint can exist without a goal.
- **Multiple active sprints allowed simultaneously** — no "only 1 active sprint" constraint.
- **getGoalProgress()**: Batch query with `GROUP BY goalId` — no N+1 per goal.
- **goalId in sprints**: ON DELETE SET NULL (sprint survives if goal deleted).
- **goals.targetValue**: `numeric(12,4)` — supports both % and absolute values.

## Goal Hierarchy

```
Project Goal (project-scoped)
  ├── Example: "Tăng organic traffic 40% trong Q2 2026" (project: example.com)
  ├── targetMetric: 'traffic', targetValue: 40, unit: '%'
  ├── startDate: 2026-04-01, endDate: 2026-06-30
  │
  └── Sprint / Campaign (milestone-level, goalId nullable)
        ├── Example: "Sprint 1 — Technical fixes (Apr 1–15)"
        ├── Example: "Content sprint — 20 pillar articles (Apr–May)"
        │  (standalone sprint — no goal required)
        └── Tasks (execution-level)
              ├── "Fix LCP issues on /product pages"
              ├── "Write pillar article: Link Building Guide"
              └── "Optimize meta descriptions — 50 pages"
```

## Backend API

### Goals Routes (`packages/api-app/src/routes/goals.ts`)

```
GET    /api/goals              — list (filter: workspaceId, projectId, status)
POST   /api/goals              — create
GET    /api/goals/:id          — get with linked sprints + tasks count
PUT    /api/goals/:id          — update
DELETE /api/goals/:id          — delete
GET    /api/goals/:id/progress — computed progress { tasksTotal, tasksDone, metricCurrent }
```

### Sprints Routes (`packages/api-app/src/routes/sprints.ts`)

```
GET    /api/sprints            — list (filter: workspaceId, goalId, status)
POST   /api/sprints            — create
PUT    /api/sprints/:id        — update
DELETE /api/sprints/:id        — delete
POST   /api/sprints/:id/start  — set status=active, startDate=now
POST   /api/sprints/:id/complete — set status=completed, endDate=now
GET    /api/sprints/:id/tasks  — tasks in this sprint
```

### Progress Calculation (server-side)

```ts
// Batch query — 1 SQL for all goals in list (no N+1)
// Used by GET /api/goals list endpoint
async function batchGoalProgress(goalIds: number[]) {
  return db
    .select({
      goalId: tasks.goalId,
      tasksTotal: count(),
      tasksDone: count(sql`CASE WHEN ${tasks.status} = 'done' THEN 1 END`),
    })
    .from(tasks)
    .where(inArray(tasks.goalId, goalIds))
    .groupBy(tasks.goalId);
}

// GET /api/goals/:id/progress → single goal detail with metric progress
// GET /api/goals list → inline progress via batchGoalProgress() — no extra queries
```

## Frontend Pages

### Goals Page (`/dashboard/goals`)

```
GoalsPage
  ├── Header: "Goals" + [Create Goal] button
  ├── GoalFilters (status: active/completed/all, project)
  └── GoalsList
      └── GoalCard (each goal)
          ├── Title, type badge, date range
          ├── ProgressBar (% tasks done)
          ├── Sprint count, Task count
          ├── Status badge (active/completed/overdue)
          └── [View Sprints] [Edit] [Delete]
```

### Goal Detail (`/dashboard/goals/[id]`)

```
GoalDetailPage
  ├── GoalHeader (title, metric target, progress)
  ├── SprintsSection
  │   ├── [Create Sprint] button
  │   └── SprintCard[]
  │       ├── Name, date range, status
  │       ├── Task count + done count
  │       └── [View Tasks] → filtered tasks board
  └── LinkedTasksSection
      └── TaskList (all tasks under this goal)
```

### Sprint Planning View

When viewing a sprint → show tasks board filtered by `sprintId`:
- Uses same Board/Timeline/Table components from Phase 04
- Filter pre-applied: `sprintId=X`
- "Add to sprint" button on task cards when sprint is active

### Goal Create/Edit Dialog

```
Fields:
- Title *
- Project (which website this goal is for)
- Type: traffic | ranking | conversion | custom
- Target metric (optional): clicks / impressions / position / sessions / conversions
- Target value + unit
- Start date + End date
- Description
```

## Goal-Task Linking UX

Two ways to link task → goal/sprint:

1. **From task detail panel** (Phase 04): Goal select + Sprint select dropdowns
2. **From sprint view**: "Add existing task to sprint" or create task directly in sprint

## Team Workload View

On goals/sprints page, show workload summary:

```
Team Workload (Active Sprint: "Sprint 1")

Alice  ████████░░  8 tasks, 40h assigned
Bob    ████░░░░░░  4 tasks, 18h assigned
Carol  ██░░░░░░░░  2 tasks, 8h assigned (available)
```

Simple bar chart using task count × estimatedMinutes per user.

## Related Code Files

**Create:**
- `packages/api-app/src/routes/goals.ts`
- `packages/api-app/src/routes/sprints.ts`
- `packages/api-app/src/schemas/goal-schema.ts`
- `apps/web/src/app/(app)/dashboard/goals/page.tsx`
- `apps/web/src/app/(app)/dashboard/goals/[id]/page.tsx`
- `apps/web/src/app/(app)/dashboard/sprints/page.tsx`
- `apps/web/src/components/features/goals/goal-card.tsx`
- `apps/web/src/components/features/goals/goal-create-dialog.tsx`
- `apps/web/src/components/features/goals/sprint-card.tsx`
- `apps/web/src/components/features/goals/workload-chart.tsx`
- `apps/web/src/hooks/use-goals.ts`
- `apps/web/src/hooks/use-sprints.ts`

**Modify:**
- `apps/web/src/components/features/tasks/task-detail-panel.tsx` — Add goal/sprint selectors

## Todo

- [ ] Create `goals.ts` API route — goals scoped to projectId, GET list returns inline batchGoalProgress
- [ ] Create `sprints.ts` API route — state machine guards on /start and /complete; multiple active sprints OK
- [ ] Create Zod schemas in `goal-schema.ts` — targetValue as numeric, goalId optional on sprint
- [ ] Implement `batchGoalProgress()` helper (GROUP BY — no N+1)
- [ ] Build GoalsPage (list view)
- [ ] Build GoalCard component with progress bar
- [ ] Build GoalCreateDialog
- [ ] Build GoalDetailPage with sprints section
- [ ] Build SprintCard component
- [ ] Build workload chart (simple bar)
- [ ] Add Goal + Sprint selectors to TaskDetailPanel
- [ ] Write SWR hooks for goals + sprints
- [ ] Run `npm run type-check`

## Success Criteria

- [ ] Can create goal with metric target
- [ ] Can create sprint linked to goal
- [ ] Task can be assigned to goal + sprint
- [ ] Goal progress bar updates as tasks are done
- [ ] Sprint board shows only sprint's tasks
- [ ] Workload chart shows team distribution
