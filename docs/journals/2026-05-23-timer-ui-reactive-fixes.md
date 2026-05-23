# Timer UI Reactive Fixes — Post Phase 04

**Date**: 2026-05-23 16:20  
**Severity**: Low (UX regression, no data loss)  
**Component**: Frontend — `task-timer-section.tsx`, `task-detail-panel.tsx`, `tasks/page.tsx`  
**Status**: Fixed & verified (type-check 8/8 clean)

---

## What Happened

Two UX bugs discovered in the Phase 04 timer system after initial deployment:

1. **Stop → Total not updating**: Stopping the timer reset the elapsed display to `00:00`, but "Total" time stayed at the pre-session value. Required closing and reopening the task sidebar to see updated total.

2. **1–3 second delay** before total updated even after Fix 1, due to sequential API round-trips on Vercel serverless.

---

## Root Causes

### Bug 1 — Stale React state snapshot

`tasks/page.tsx` stored the opened task as `useState<Task | null>`, freezing a snapshot at click time:

```ts
const [selectedTask, setSelectedTask] = useState<Task | null>(null)
// ↑ snapshot frozen at click time — never updates when SWR refetches
```

After `mutate()` triggered a refetch, the `tasks` SWR array updated with new `timeSpent`, but `selectedTask` still held the old frozen object. Closing/reopening worked because `openDetail(tasks[i])` re-ran, picking up the fresh task.

### Bug 2 — Sequential async round-trips

Even after Fix 1, the stop flow was:
```
POST /api/time-logs/stop  (~150–400ms)
  → mutate() → GET /api/tasks  (~150–400ms)
    → SWR updates → UI re-renders
```
On Vercel, cold starts add 500ms–1s per invocation → total perceived delay 1–3s.

---

## Fixes Applied

### Fix 1 — Derive `selectedTask` from SWR cache (`tasks/page.tsx`)

```ts
// Before — frozen snapshot
const [selectedTask, setSelectedTask] = useState<Task | null>(null)

// After — derived from live SWR cache
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
const selectedTask = useMemo(
  () => tasks.find((t) => t.id === selectedTaskId) ?? null,
  [tasks, selectedTaskId]
)
```

`selectedTask` now automatically reflects the latest SWR state. When `mutate()` revalidates `tasks`, `selectedTask` updates in the same render.

### Fix 2 — Optimistic SWR update (`task-detail-panel.tsx` + `task-timer-section.tsx`)

`onStop` prop signature changed from `() => void` → `(elapsed: number) => void`.

In `task-timer-section.tsx`, elapsed is captured before `stopTimer()` resets it to 0:
```ts
const elapsed = elapsedSeconds  // capture before stopTimer() resets to 0
await stopTimer()
onStop?.(elapsed)
```

In `task-detail-panel.tsx`, optimistic cache update fires immediately:
```ts
onStop={(elapsed) => {
  mutate(
    (current) => current?.map((t) =>
      t.id === task.id ? { ...t, timeSpent: (t.timeSpent ?? 0) + elapsed } : t
    ),
    { revalidate: true }  // update cache now, sync with DB in background
  )
}}
```

UI updates at click time. Background refetch corrects any drift.

---

## Commits

- `4dfc6f3` — fix(tasks): refetch task data after stopping timer
- `dd5c038` — fix(tasks): derive selectedTask from SWR cache to prevent stale snapshot
- (this fix) — fix(tasks): optimistic SWR update on timer stop for instant UI feedback

---

## Lessons Learned

1. **Never store derived data in `useState` when the source is reactive.** If a value can be computed from a reactive source (SWR cache, store), derive it with `useMemo`. Storing snapshots creates silent staleness bugs that only surface on state transitions.

2. **SWR optimistic updates eliminate perceived latency.** For any write that has a known local result, update the SWR cache immediately with `mutate(updater, { revalidate: true })`. Background revalidation handles edge cases; the UI feels instant.

3. **Sequential API round-trips are a UX tax on serverless.** POST then GET = 2× cold start penalty on Vercel. Optimistic updates are the correct solution for this class of problem — cheaper and more reliable than infrastructure upgrades.
