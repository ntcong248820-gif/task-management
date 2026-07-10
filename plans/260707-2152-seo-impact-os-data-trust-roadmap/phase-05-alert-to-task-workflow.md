---
phase: 5
title: "Alert To Task Workflow"
status: pending
priority: P2
effort: "2-3d"
dependencies: [3]
---

# Phase 5: Alert To Task Workflow

## Context Links

- `packages/db/src/schema/alerts.ts`
- `packages/db/src/schema/tasks.ts`
- `packages/api-app/src/routes/alerts.ts`
- `packages/api-app/src/routes/tasks.ts`
- `packages/api-app/src/jobs/alert-engine.ts`
- `apps/web/src/app/dashboard/analytics/alerts/page.tsx`
- `apps/web/src/components/features/alerts/alert-card.tsx`
- `apps/web/src/hooks/use-alerts.ts`
- `apps/web/src/hooks/use-tasks.ts`

## Overview

Convert alerts from passive notifications into trackable SEO work. Users should accept, dismiss, or create a task from each actionable alert.

## Key Insights

- Alerts support read/delete only. That loses workflow state.
- Tasks already have `targetUrl`, `taskType`, `priority`, `tags`, impact dates, and `actualImpact`.
- Start small: lifecycle fields on alerts are enough; no separate recommendation backlog table yet.
- Team ops is deferred. Alert ownership/routing stays simple: action actor is recorded, but no team assignment workflow yet.

## Requirements

- Functional: alert lifecycle, create task from alert, link alert to task, show status in alert UI.
- Non-functional: idempotent task creation, workspace-safe, no duplicate tasks from double-click.

## Architecture

Extend alerts with workflow fields:
- `status`: `new`, `accepted`, `dismissed`, `task_created`
- `acceptedBy`, `acceptedAt`
- `dismissedBy`, `dismissedAt`
- `linkedTaskId`

No alert assignee/owner field in this phase. When user creates a task from an alert, task assignment follows the existing task defaults.

Add API endpoints:
- `PATCH /api/alerts/:id/status`
- `POST /api/alerts/:id/create-task`

`create-task` maps alert metadata to task fields and returns existing linked task if already created.

## Related Code Files

- Modify: `packages/db/src/schema/alerts.ts`
- Create: `packages/db/migrations/{timestamp}_alert_lifecycle.sql`
- Modify: `packages/api-app/src/routes/alerts.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `apps/web/src/hooks/use-alerts.ts`
- Modify: `apps/web/src/components/features/alerts/alert-card.tsx`
- Modify: `apps/web/src/app/dashboard/analytics/alerts/page.tsx`
- Add tests for alert lifecycle and idempotent task creation.

## Implementation Steps

1. Add alert lifecycle migration with check constraint.
2. Backfill existing alerts to `status='new'`.
3. Add `alerts.linked_task_id` FK referencing tasks with `ON DELETE SET NULL`.
4. Update shared alert types.
5. Implement status update endpoint with workspace ownership check.
6. Implement create-task endpoint:
   - verify alert belongs to workspace.
   - if linked task exists, return it.
   - infer task title, description, target URL, priority, tags.
   - do not add team routing; created task uses current task defaults.
   - create task under alert project.
   - update alert status to `task_created`.
7. Add UI actions:
   - Accept.
   - Dismiss.
   - Create task.
   - Open linked task.
8. Add filters for lifecycle status.
9. Convert normal user delete/dismiss behavior to lifecycle status, or reserve hard delete for admin/cleanup route only.
10. Add tests for permissions, duplicate create, metadata mapping, and lifecycle preservation.

## Todo List

- [ ] Alert lifecycle schema.
- [ ] Alert status API.
- [ ] Alert create-task API.
- [ ] Shared types updated.
- [ ] Alert UI actions.
- [ ] Lifecycle filters.
- [ ] Tests for idempotency and workspace scope.

## Success Criteria

- [ ] User can turn an alert into a task in under 2 minutes.
- [ ] Double-click create task does not create duplicates.
- [ ] Dismissed alerts remain auditable or recoverable per chosen UX.
- [ ] Alert-to-task works without team assignment/routing.
- [ ] Alert list shows workflow status.
- [ ] Tests pass.

## Risk Assessment

- Risk: alert metadata lacks URL/keyword. Mitigation: fallback to project-level task with clear description.
- Risk: task spam. Mitigation: require click confirmation for high-volume recommendation alerts.
- Risk: hard delete conflicts with lifecycle. Mitigation: normal user action becomes `dismissed`; hard delete stays admin/cleanup only if kept.

## Security Considerations

- Verify alert workspace and project before creating task.
- Do not allow creating tasks in projects outside active workspace.

## Next Steps

Phase 6 reporting can include accepted/dismissed/task-created counts.
