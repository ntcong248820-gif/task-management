---
name: project-alert-task-race-condition
description: alert-to-task create-task idempotency check (packages/api-app/src/routes/alerts.ts) has a TOCTOU race — no DB-level guard against duplicate tasks from concurrent double-click
metadata:
  type: project
---

`POST /api/alerts/:id/create-task` (packages/api-app/src/routes/alerts.ts) checks `alert.linkedTaskId` before inserting a task, then inserts, then updates the alert with the new `linkedTaskId`. This is a classic read-then-write race: two concurrent requests for the same alert both read `linkedTaskId === null`, both pass the check, both insert a task, and the second `UPDATE alerts SET linked_task_id = ...` silently overwrites the first — leaving one orphaned duplicate task with no `alerts` row pointing back at it.

**Why**: No unique constraint exists on `alerts.linked_task_id` (nullable FK only, see packages/db/src/schema/alerts.ts) and no transaction/row lock wraps the check-then-insert-then-update sequence. Sequential double-click (button disabled via `actionPending` state in alert-card.tsx) is covered, but truly concurrent requests (e.g. two browser tabs, or a retry after a slow response before the client marks pending) are not. Plan doc (snappy-puzzling-lemur.md) explicitly chose this approach over a unique constraint ("handles double-click without needing a unique constraint gymnastics on the tasks side") — this is a deliberate accepted trade-off, not an oversight, but worth re-flagging if duplicate-task reports appear in production.

**How to apply**: If asked to review this route again or investigate duplicate-task bug reports tied to alerts, check this exact race first before assuming a new bug. Fix would be a partial unique index on `alerts(linked_task_id) WHERE linked_task_id IS NOT NULL` or wrapping the check+insert+update in a single `SELECT ... FOR UPDATE` transaction.
