# Phase 04 Post-Review Bug Fixes

**Date**: 2026-05-23 14:30  
**Severity**: Medium (1 Critical, 4 Medium/Low)  
**Component**: Task Management v2 — CreateTaskDialog, KanbanBoard, TaskDetailPanel, TimelineView  
**Status**: Fixed, type-check clean, pushed to main

---

## What Happened

After Phase 04 implementation completed, a post-release code review caught 5 bugs — 1 critical blocker and 4 medium/low severity issues. The Vercel deploy triggered by the push will serve as the live verification.

---

## Bugs Fixed

### Bug 1 (Critical) — "Project not Found" on task creation

**Symptom**: Clicking "Create task" returned `{ success: false, error: "Project not found" }`. The dialog had no project dropdown, so the user had no way to see or change which project they were creating into.

**Root cause**: Two compounding issues:
1. `CreateTaskDialog` used `projectId` passed as a prop from Zustand store (`useProjectStore.selectedProjectId`), which is **persisted to localStorage**.
2. `WorkspaceSelector` is a dynamic/SSR-false import — it mounts *after* hydration and only then calls `fetchProjects()`, which validates + possibly updates the stored project ID.
3. **Race window**: From hydration until `fetchProjects()` completes, `selectedProjectId` may hold a stale UUID from a previous workspace or a DB-reset session. If the user clicks "New task" in this window, the API receives a project UUID that no longer belongs to the current workspace → 404.

**Fix**: Added a **Project `<Select>` dropdown** to `CreateTaskDialog`, seeded from `useWorkspaceStore.projects`. On dialog open, auto-selects the passed `projectId` prop; falls back to `projects[0]` if prop is null/stale. User can now see and change the project before submitting, eliminating the race condition entirely.

```tsx
// create-task-dialog.tsx
const projects = useWorkspaceStore((state) => state.projects)
const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? "")

useEffect(() => {
  if (open) setSelectedProjectId(projectId ?? projects[0]?.id ?? "")
}, [open, projectId, projects])
```

---

### Bug 2 (Medium) — Timer conflict silent failure on Kanban board

**Symptom**: Clicking the timer icon on a task card while another timer was active did nothing — no feedback.

**Root cause**: `handleTimerClick` in `kanban-board.tsx` called `startTimer()` but never checked the error return value. The "Stop X first" inline warning only appeared in `TaskDetailPanel`, not in the board.

**Fix**: Checked `result.error` from `startTimer()` and called `toast.warning("Stop timer for X first")` via `sonner`. Added `<Toaster>` to `dashboard-shell.tsx`. Installed `sonner@2.0.7`.

---

### Bug 3 (Medium) — dnd sensors lacked activation constraint

**Symptom** (potential): Without movement threshold, a click could trigger drag-start → immediate drag-end even without actual dragging.

**Fix**: Added `MouseSensor` (8px distance) and `TouchSensor` (250ms delay + 5px tolerance) via `useSensors`, eliminating accidental drags on card click.

---

### Bug 4 (Medium) — Stale `defaultValue` inputs in TaskDetailPanel

**Symptom**: Date, description, and `targetUrl` fields showed stale data if the selected task changed while the panel remained open (both tasks are clicked from the board).

**Root cause**: These inputs used `defaultValue` (uncontrolled React pattern). The `useEffect` in the panel only reset the `title` field on `task?.id` change. Uncontrolled inputs ignore prop changes after initial mount.

**Fix**: Added `key={task.id}` to `SheetContent`, forcing a full re-mount whenever the task changes. All uncontrolled inputs reset automatically.

---

### Bug 5 (Low) — Silent `targetUrl` validation failure

**Symptom**: Entering `ftp://example.com` in the Target URL field silently did nothing — no save, no error.

**Root cause**: The `onBlur` handler only called `save()` if the URL started with `http://` or `https://`. Invalid URLs fell through silently.

**Fix**: Added `urlError` state and displays `"URL must start with https:// or http://"` beneath the input on invalid input.

---

### Bug 6 (Low) — `undatedTasks` not memoized in TimelineView

`undatedTasks` was computed inline outside `useMemo`, recomputing on every render. Wrapped in `useMemo([tasks])`.

---

## Addendum — Phase 04 Final Blocker Fix (2026-05-23 15:07)

### Bug 7 (Critical) — Broken UUID regex blocks all backend operations

**Detected by:** Post-fix browser acceptance testing (AI QA subagent, `2026-05-23-phase-04-final-acceptance-verification.md`)

**Symptom:** Every API call involving a project, task, goal, or sprint returns `400 Invalid project ID` or `404 Project not found` for all real Supabase-generated UUIDs.

**Root cause:** Typo in `isUuid` regex at [project-access.ts:3](packages/api-app/src/utils/project-access.ts):
```
// Before (broken — missing 4th group + dash)
[89ab][0-9a-f]{12}

// After (correct — matches variant 4-char group + separator + 12-char random)
[89ab][0-9a-f]{3}-[0-9a-f]{12}
```
Standard UUID v4: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` has 5 groups separated by 4 dashes. The old regex collapsed the last two groups into 13 continuous chars, so no Supabase UUID (36 chars with 4 dashes) ever matched.

**Impact:** `isUuid()` is called as an early guard in `requireProjectInWorkspace()`, `projectBelongsToWorkspace()`, `goalBelongsToWorkspace()`, `sprintBelongsToWorkspace()`. All 4 functions returned `false`/400/404 for every real ID.

**Fix:** [project-access.ts:3](packages/api-app/src/utils/project-access.ts) — 1-char addition (`-[0-9a-f]{3}` inserted before the final group).

**Verified:** Node.js inline test confirms all 3 real UUIDs → `true`, `not-a-uuid` → `false`. Type-check 8/8 pass.

---

## Commits

```
8a586fe  deps(web): add sonner for toast notifications
ee96f41  fix(tasks): resolve project-not-found bug, add timer feedback,
         stale input reset, url validation, and dnd sensors
[next]   fix(api): correct UUID regex in project-access — missing 4th group
```

---

## Lessons Learned

1. **Zustand localStorage + dynamic imports = hidden race window.** Any store value persisted to localStorage can be stale during the window between hydration and the first async validation call. UI that submits that value to an API must either re-validate it or let the user confirm it before submitting.

2. **Missing UI ≠ silent bug.** `CreateTaskDialog` had no project field because the parent "already knew" the project. When the parent's knowledge is unreliable (stale localStorage), the dialog becomes a silent footgun. Surfacing the project in the form was both the correct UX and the correct defensive fix.

3. **`defaultValue` on uncontrolled inputs doesn't follow prop changes.** A sheet/panel pattern where the same component instance is reused for different tasks must either use `key` to force re-mount or convert inputs to controlled.

4. **Regex validators need unit tests.** The UUID regex bug existed silently across all environments because there were no tests for `isUuid()`. A single parameterized test with 4-5 valid UUIDs would have caught the typo immediately. All utility validation functions must be covered by unit tests.

---

## Deferred (MVP-acceptable)

| Issue | Notes |
|-------|-------|
| `syncFromDb` doesn't filter by `userId` | Only breaks in multi-user workspaces; single-user MVP unaffected |
| TaskDetailPanel missing Assignee, Sprint, Goal, Tags, Activity log | Deferred per Phase 04 plan |
| TableView inline cell editing | Delegated to detail panel for MVP |
