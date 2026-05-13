---
date: 2026-05-11
time: 19:41–20:14 ICT
session: Phase 04-05 Feasibility Review + Cross-Phase Conflict Resolution
plan: plans/260510-1600-v2-greenfield-rebuild/
report: plans/reports/review-260511-1941-phase-04-05-feasibility.md
---

# 2026-05-11 — Phase 04-05 Review & Conflict Resolution

## What Happened

Reviewed Phase 04 (Task Management v2) and Phase 05 (Goals & Sprint Management) for feasibility and best-practice alignment before implementation begins. Used `/ck:databases` and `/ck:backend-development` skills as evaluation lenses. Found 3 critical issues, 7 warnings, then resolved 5 unresolved architectural questions with the user. Finished by auditing all 7 phases for cross-plan conflicts and patching 4 files.

---

## Scouting Results (v1 Baseline)

Two parallel Explore agents mapped the existing codebase:

**DB layer (v1):** 9 tables total — `projects`, `tasks`, `time_logs`, `oauth_tokens`, `gsc_sites`, `ga4_properties`, `gsc_data`, `gsc_data_aggregated`, `ga4_data`. Key gaps vs v2 plan:
- `tasks`: status only 3 values (todo|in_progress|done), no workspace/user/sprint/goal FK, `assignedTo` plain text (no FK)
- No `goals`, `sprints`, `task_templates`, `alerts` tables
- All PKs are `serial` (integer) — v2 schema uses UUID everywhere

**API layer (v1):** Basic CRUD only. No auth middleware, no workspaceId scoping. Single `GET /api/tasks?projectId=X` with no filters for sprint/goal/assignee/status/dateRange.

**Frontend (v1):** 3-column KanbanBoard (todo|in_progress|done), `@dnd-kit` for DnD, Zustand for project selection, SWR for data fetching. Everything is single-user, no session awareness.

---

## Critical Issues Found

### 1. workspaceId in query param → Security flaw

Phase 04 plan specified `GET /api/tasks?workspaceId=X&projectId=Y`. This allows any authenticated user to forge a `workspaceId` and read another workspace's tasks.

**Fix:** `workspaceId` extracted exclusively from Better Auth session via `c.get('workspaceId')` (set by Phase 01 auth middleware). Removed from all route query param documentation.

### 2. N+1 query in getGoalProgress()

Phase 05 plan showed:
```ts
async function getGoalProgress(goalId: number) {
  const tasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
  ...
}
```
Called once per GoalCard → 20 goals = 20+ sequential queries on every page load.

**Fix:** Replaced with `batchGoalProgress(goalIds[])` — single SQL with `COUNT + CASE WHEN + GROUP BY goalId`. GoalsList endpoint returns inline progress, no extra roundtrips.

### 3. Missing 9 composite indexes

Phase 04-05 plans didn't define any indexes for the new FK columns. Given v2 query patterns (filter by workspace+status, workspace+sprint, workspace+goal, workspace+assignee, date ranges), this would cause full-table scans on a growing task table.

**Fix:** All 9 indexes consolidated into Phase 02 schema (source of truth). Phase 04-05 plans updated to reference Phase 02 for index definitions.

---

## Architectural Decisions (User Q&A)

Five unresolved questions from the review were answered by the user:

| Question | Decision |
|----------|----------|
| Fresh DB or migrate v1 data? | **Fresh DB** — preserve learnings from v1 GSC sync quirks, no backfill scripts needed |
| Goals: workspace-wide or project-scoped? | **Project-scoped only** — each website/project has independent goals |
| Standalone sprints (no goal)? | **Allowed** — `goalId` on sprints is nullable |
| Multiple active sprints simultaneously? | **Allowed** — no "1 active sprint" constraint |
| Template lazy spawn trigger location? | **TasksPage mount** — most-visited page, explained with plain language |

Additional architecture decisions locked in this session:
- **Timeline view**: CSS Grid only — rejected `gantt-task-react` (adds 45KB, opinionated styles, harder to customize for a Gantt-lite)
- **Timer store**: Single active timer per user — persist elapsed time to `localStorage` for page refresh survival
- **Pagination**: `limit=50&offset=0` on `GET /api/tasks` — reuse existing `PaginatedResponse<T>` type from `packages/types/`

---

## Cross-Phase Conflict Audit

After locking decisions, audited all 7 phases for downstream conflicts:

**Phase 02 — 3 conflicts fixed:**

1. `goals.projectId` was nullable with comment `// nullable = workspace-level`. Since goals are project-scoped, changed to:
   ```ts
   projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' })
   ```
2. `goals.targetValue` precision was `(12,2)`. Changed to `(12,4)` to support percentages like `0.4050 = 40.50%`.
3. Index on goals table changed from `goals_workspace_status_idx(workspaceId, status)` to `goals_workspace_project_status_idx(workspaceId, projectId, status)` — matches actual query pattern.

**Phase 04 — 1 conflict fixed:**

Plan mentioned adding `templateSpawnDate` as a new column for idempotent lazy spawn. Phase 02's `tasks` table already has `recurringTemplateId + startDate` — sufficient for the check:
```sql
WHERE recurring_template_id = $templateId AND start_date = $today
```
Removed the new-column proposal, updated plan to reference existing columns.

**Phase 06 — 1 pre-existing bug fixed:**

`runAlertEngine(workspaceId: string, projectId: number)` — `projectId` typed as `number` but Phase 02 uses UUID strings everywhere. Corrected to `projectId: string`.

**Phase 01, 03, 07 — no conflicts.** Phase 01 already plans to set `workspaceId` from session context correctly. Phase 03 shell is unaffected by implementation decisions. Phase 07 correlation uses `affectsWebsite` field which Phase 02 already defines.

---

## Files Changed

| File | Change |
|------|--------|
| `plan.md` | Phase 04-05 Review column → reference to `review-260511-1941-phase-04-05-feasibility.md` |
| `phase-02-schema-redesign.md` | `goals.projectId` NOT NULL + cascade; `targetValue` precision (12,4); updated index name |
| `phase-04-task-management-v2.md` | Decisions section added; idempotent spawn uses existing columns; workspaceId security note |
| `phase-05-goals-sprints.md` | Decisions section added; `batchGoalProgress()` replaces N+1 pattern |
| `phase-06-analytics-intelligence.md` | `projectId` type corrected to `string` UUID |

---

## Key Takeaways

**workspaceId is always auth context, never user input.** In any multi-tenant system, workspace/org ID must come from the validated session, not the request body or query string. Phase 01 sets it via `c.set('workspaceId', session.session.activeOrganizationId)` — all other phases consume it from there.

**N+1 in progress queries is a planning-time trap.** When the plan shows a helper function called once per list item, it will always be an N+1 at runtime. The fix is always the same: pass the full ID list, run one `GROUP BY` query, merge results in application code.

**Phase 02 is schema's single source of truth.** Any structural decision made in a downstream phase (04, 05, 06...) that touches tables must be reconciled back to Phase 02 before implementation begins. This session caught 4 such drift points that would have caused runtime type errors or missing indexes.

**Idempotent spawn without extra columns.** `recurringTemplateId + startDate` composite lookup is sufficient — adding a dedicated `templateSpawnDate` column is premature. Existing schema handles it.

**Goals scope directly shapes schema cardinality.** "Are goals workspace-wide or project-scoped?" changes `projectId` from nullable to NOT NULL and `onDelete` from `set null` to `cascade` — a structurally significant difference that must be resolved before schema migration runs.

---

## State After Session

All 7 phases are internally consistent. Phase 04-05 plans have decisions documented. Phase 02 schema is the authoritative source with all indexes, correct column types, and proper FK constraints. The plan is ready for implementation to begin at Phase 01 → 02 → 03 → 04 → 05 → 06 → 07.
