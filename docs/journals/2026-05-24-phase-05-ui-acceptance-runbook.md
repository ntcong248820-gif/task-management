# Phase 05 UI Acceptance Runbook

Date: 2026-05-24
Scope: Goals & Sprint Management UI after Phase 05
Audience: Browser-based AI acceptance tester
Status: Ready for UI smoke

## Context

Phase 05 adds goal hierarchy and sprint planning on top of Phase 04 task views.
This runbook validates user-visible behavior only. It does not replace API integration tests.

## Prerequisites

- App is running locally or on target deployment.
- Tester can log in and has an active workspace.
- At least one project exists. If not, create one from Settings > Projects first.
- Browser console and network panel should stay open during testing.

## Acceptance Rules

- Mark PASS only when the UI action works and persisted data survives refresh.
- Mark FAIL when the page crashes, console shows runtime errors, API returns visible errors, or data disappears after refresh.
- Screenshots should be captured for each FAIL.
- Do cleanup only after all linked-flow tests are captured.

## Test Data

Use unique names with timestamp:

- Goal title: `Phase 05 Acceptance Goal {timestamp}`
- Sprint name: `Phase 05 Acceptance Sprint {timestamp}`
- Standalone sprint name: `Phase 05 Standalone Sprint {timestamp}`
- Task title: `Phase 05 Sprint Task {timestamp}`

## Test 1: Goals List Loads

1. Navigate to `/dashboard/goals`.
2. Confirm the page renders without crashing.
3. Confirm status filter and project filter are visible.
4. Change filters between all available options.

Expected:
- No empty Select runtime crash.
- Filters change without blank page.
- Existing or empty state content stays coherent.

## Test 2: Create Goal

1. Click Create Goal.
2. Fill required fields:
   - Title: test goal title.
   - Project: active project.
   - Type: any valid type.
   - Start date and end date: valid range.
3. Fill optional metric fields if visible.
4. Submit.
5. Refresh `/dashboard/goals`.

Expected:
- Goal appears in list after submit.
- Goal still appears after refresh.
- Goal card shows title, status, date range, and progress/task counts.

## Test 3: Goal Detail

1. Open the created goal detail page from the goal card.
2. Confirm the goal header renders.
3. Confirm linked sprints section renders.
4. Confirm workload/progress area renders.

Expected:
- Detail page loads without 404 or crash.
- Goal data matches created goal.
- Empty linked sections render as empty states, not errors.

## Test 4: Create Sprint Linked To Goal

1. From goal detail, create a sprint.
2. Fill name, date range, and optional description.
3. Submit.
4. Refresh goal detail.

Expected:
- Sprint appears under the goal.
- Sprint status starts as planning.
- Sprint persists after refresh.

## Test 5: Sprint Lifecycle

1. On the linked sprint card, click Start.
2. Confirm status changes to active.
3. Refresh page.
4. Click Complete.
5. Confirm status changes to completed.
6. Refresh page.

Expected:
- Status transitions persist.
- No direct status edit UI is required.
- Multiple active sprints are allowed, so no single-active enforcement should block this flow.

## Test 6: Standalone Sprint

1. Navigate to `/dashboard/sprints`.
2. Create a sprint without selecting a goal if UI allows it.
3. Refresh `/dashboard/sprints`.

Expected:
- Standalone sprint can be created.
- It appears in sprints list.
- No goal is required.

## Test 7: Task Detail Goal/Sprint Assignment

1. Navigate to `/dashboard/tasks?view=board`.
2. Open an existing task, or create one if none exists.
3. In the task detail panel, assign the created goal.
4. Assign the linked sprint.
5. Close and reopen the task detail panel.
6. Refresh the page and reopen the same task.

Expected:
- Goal and sprint selectors do not crash.
- Assigned values persist after close/reopen.
- Assigned values persist after refresh.
- Clearing goal/sprint, if available, sets value back to none without crash.

## Test 8: Sprint-Filtered Task Board

1. Return to `/dashboard/sprints` or goal detail.
2. On the sprint card, click Tasks.
3. Confirm URL becomes `/dashboard/tasks?view=board&sprintId={id}`.
4. Confirm board shows sprint-filtered context.
5. Create a new task from this board.
6. Refresh page.

Expected:
- URL includes `sprintId`.
- New task appears on the sprint-filtered board.
- New task has the sprint assigned in task detail.

## Test 9: View Switch Preserves Sprint Filter

1. While on `/dashboard/tasks?view=board&sprintId={id}`, switch to Timeline.
2. Switch to Table.
3. Switch to Calendar.
4. Switch back to Board.

Expected:
- URL keeps the same `sprintId` after every view switch.
- Task list remains scoped to the sprint.
- No full-page crash or lost filter state.

## Test 10: Goal Progress Updates

1. Use a task assigned to the created goal.
2. Move or edit task status to done.
3. Return to `/dashboard/goals`.
4. Refresh.

Expected:
- Goal progress/task done count reflects the completed task.
- Progress remains task-count based; analytics metric progress is not expected in Phase 05.

## Test 11: Delete And Cleanup

1. Delete test standalone sprint.
2. Delete linked sprint if UI allows.
3. Delete test goal if UI allows.
4. Refresh goals and sprints pages.

Expected:
- Deleted records disappear.
- Deleting goal should not crash sprint/task pages.
- If sprint survives goal deletion, it should show no linked goal.

## Regression Watchlist

- No Radix Select error about empty item values.
- No loss of `sprintId` when changing task views.
- No Zod/build-related runtime error when creating or updating goals/sprints.
- No cross-project leakage: selected project filters should not show unrelated project goals.
- No stale UI after sprint Start or Complete.

## Pass/Fail Summary Template

| Test | Result | Evidence | Notes |
|------|--------|----------|-------|
| 1 Goals list loads | PASS/FAIL | screenshot/log | |
| 2 Create goal | PASS/FAIL | screenshot/log | |
| 3 Goal detail | PASS/FAIL | screenshot/log | |
| 4 Create linked sprint | PASS/FAIL | screenshot/log | |
| 5 Sprint lifecycle | PASS/FAIL | screenshot/log | |
| 6 Standalone sprint | PASS/FAIL | screenshot/log | |
| 7 Task assignment | PASS/FAIL | screenshot/log | |
| 8 Sprint board | PASS/FAIL | screenshot/log | |
| 9 View switch filter | PASS/FAIL | screenshot/log | |
| 10 Goal progress | PASS/FAIL | screenshot/log | |
| 11 Cleanup | PASS/FAIL | screenshot/log | |

## Known Limits

- Browser acceptance requires a real app runtime and database.
- Root `npm run test` was previously blocked by local Postgres not running on `localhost:5432`; this runbook checks UI behavior, not that integration-test environment.
- Production-ready verdict still needs live deployment smoke if the target is production, not local code-complete.

## Next

After browser acceptance:
- Record PASS/FAIL table in a report under `plans/reports/`.
- If failures appear, attach screenshot, console error, network response, and exact URL.
- If all pass, Phase 05 can be treated as UI-accepted, with production smoke as the next separate gate.
