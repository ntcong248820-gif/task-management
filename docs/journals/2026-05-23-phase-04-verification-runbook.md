# Phase 04 Verification Runbook — Post-Fix Browser Testing

**Date**: 2026-05-23  
**Target**: https://task-management-web-zeta.vercel.app  
**Auth**: Log in with the workspace account before starting (Google OAuth on `/login`)  
**Precondition**: Vercel deploy from commit `ee96f41` must be live (check Vercel dashboard or `vercel ls`)

---

## Setup

1. Navigate to `https://task-management-web-zeta.vercel.app/login`
2. Complete Google OAuth
3. Confirm workspace **"Team TGDD"** is active in the header workspace selector
4. Confirm at least one project exists in the Project selector. If not, run in browser console:
   ```js
   await fetch('/api/projects', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ name: 'Test Project', isActive: true })
   }).then(r => r.json())
   ```
   Then refresh the page.

---

## Test Cases

### TC-01 — Project Selector in Create Task Dialog

**Bug fixed**: "Project not Found" on task creation (stale localStorage race condition)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to `/dashboard/tasks` | Board view loads with tasks or empty state |
| 2 | Click **"New task"** button (top right) | Dialog opens |
| 3 | Inspect dialog fields | Must see a **"Project"** `<select>` dropdown populated with workspace projects |
| 4 | Confirm the correct project is pre-selected | Should match the project shown in header |
| 5 | Enter title `"TC-01 test task"`, keep defaults, click **"Create task"** | Dialog closes, task appears in Backlog column |
| 6 | **PASS if**: Task created without "Project not found" error |

---

### TC-02 — Timer Conflict Toast on Kanban Board

**Bug fixed**: No feedback when starting timer on a card while another timer is active

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click any task card to open detail panel | TaskDetailPanel slides open |
| 2 | In the **Time Tracking** section, click **"Start"** | Timer starts (counter turns green) |
| 3 | Close the panel (click X or press Escape) | Timer keeps running (visible on task card icon) |
| 4 | Hover over a **different** task card | Timer icon appears on hover |
| 5 | Click the timer icon on the different card | Toast appears top-right: `"Stop timer for [task name] first"` |
| 6 | **PASS if**: Toast warning appears; the second timer does NOT start |

---

### TC-03 — Detail Panel Resets When Switching Tasks

**Bug fixed**: Stale `defaultValue` inputs when task changes without closing panel

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create two tasks with different due dates (TC-03a: `2026-06-01`, TC-03b: `2026-07-15`) via "New task" dialog | Both tasks visible on board |
| 2 | Click **TC-03a** card → panel opens → note the due date field shows `2026-06-01` | ✓ |
| 3 | Without closing panel, click **TC-03b** card on the board | Panel switches to TC-03b |
| 4 | Check the due date field | Must show `2026-07-15`, NOT the stale `2026-06-01` |
| 5 | Check the title field | Must show TC-03b's title |
| 6 | **PASS if**: All fields reflect TC-03b's data after switching |

---

### TC-04 — Target URL Validation Error

**Bug fixed**: Silent failure when entering invalid URL scheme

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open any task's detail panel | Panel visible |
| 2 | Click the **Target URL** field, type `ftp://example.com`, then click elsewhere (blur) | Error message appears below field: `"URL must start with https:// or http://"` |
| 3 | Clear the field, type `https://example.com`, blur | Error disappears; value saves silently |
| 4 | Reload the page, reopen the same task | Target URL field shows `https://example.com` |
| 5 | **PASS if**: Invalid URL shows error and does NOT save; valid URL saves correctly |

---

### TC-05 — dnd Sensor Activation Constraint (No Accidental Drag on Click)

**Bug fixed**: Clicks on task cards triggering drag-start without actual movement

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click a task card (do not drag) | Detail panel opens; card stays in its column |
| 2 | Click the card title area (not the timer button) | Same — panel opens, no drag ghost appears |
| 3 | **PASS if**: Clean click opens detail panel without triggering drag overlay |

---

### TC-06 — Drag & Drop Still Works (Regression)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click and hold a task card, drag it to a different column (e.g., Backlog → In Progress) | Drag ghost appears during drag |
| 2 | Release | Task moves to new column; status updates optimistically |
| 3 | Refresh page | Task remains in the new column (persisted to DB) |
| 4 | **PASS if**: Drag works end-to-end with persistence |

---

### TC-07 — View Switcher (Regression)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click **Timeline** tab | URL changes to `?view=timeline`; timeline renders (or empty state if no dated tasks) |
| 2 | Click **Table** tab | Table renders with tasks as rows |
| 3 | Click **Calendar** tab | Calendar renders (or empty state if no tasks with due dates) |
| 4 | Click **Board** tab | Returns to Kanban board |
| 5 | **PASS if**: No full page reload between view switches (sidebar/header do not flash) |

---

## Browser Console Helpers

```js
// Check active session workspace
await fetch('/api/health').then(r => r.json())

// List projects in current workspace
await fetch('/api/projects', { credentials: 'include' }).then(r => r.json())

// List tasks for a project (replace PROJECT_ID)
await fetch('/api/tasks?projectId=PROJECT_ID', { credentials: 'include' }).then(r => r.json())

// Check active timer for current user
await fetch('/api/time-logs?limit=5', { credentials: 'include' }).then(r => r.json())
```

---

## Pass Criteria

| TC | Feature | Status |
|----|---------|--------|
| TC-01 | Project selector in dialog + task creates successfully | ⬜ |
| TC-02 | Timer conflict toast on board | ⬜ |
| TC-03 | Detail panel inputs reset on task switch | ⬜ |
| TC-04 | targetUrl validation error + correct save | ⬜ |
| TC-05 | No accidental drag on click | ⬜ |
| TC-06 | Drag & drop regression | ⬜ |
| TC-07 | View switcher regression | ⬜ |

**All 7 must pass** to consider Phase 04 post-fix verification complete.

---

## If Tests Fail

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| Dialog has no Project dropdown | Old Vercel build still live | Wait for deploy or force redeploy |
| "Project not found" still appears | `projects` list empty in store | Run console helper above to seed project, refresh |
| Toast does not appear on timer conflict | `<Toaster>` not rendered | Check `dashboard-shell.tsx` has `<Toaster />` |
| Panel inputs do not reset | `key={task.id}` not on `SheetContent` | Check `task-detail-panel.tsx` line ~70 |
