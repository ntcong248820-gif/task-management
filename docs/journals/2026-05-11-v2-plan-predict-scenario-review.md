# Journal: v2 Greenfield Rebuild — Final Plan Review (Predict + Scenario)

**Date:** 2026-05-11 (evening)
**Session type:** Plan verification before implementation
**Plan:** `plans/260510-1600-v2-greenfield-rebuild/` (7 phases)

---

## What Happened

Ran a full feasibility review of the v2 rebuild plan using two analysis modes before touching any code:

- **`/ck:predict`** — 5-persona debate (Architect, Security, Performance, UX, Devil's Advocate)
- **`/ck:scenario`** — 12-dimension edge case decomposition → 34 scenarios identified

This was the final gate before starting implementation. The plan had already been through 5 journal review sessions (phases 01–07 individually). This session was a cross-cutting "stress test" to catch anything the per-phase reviews missed.

---

## Predict Verdict: CAUTION → Approved

All 5 personas agreed on the core architecture. No STOP triggers. Conflicts resolved:

| Topic | Conflict | Resolution |
|-------|----------|------------|
| Timeline CSS Grid | UX + Devil's Advocate flagged high complexity | Keep CSS Grid (YAGNI), but mandate "no dates" empty state |
| viewer role | Security flagged incomplete permissions | Add `project/task: ['read']` (Critical fix) |
| Content decay loop | Performance flagged 50K+ page timeout | Set-based SQL (Critical fix) |
| Alert polling | UX flagged "bell never updates" | 30s setInterval on SWR mutate |
| `searchParams` async | Architect flagged Next.js 15 runtime crash | `await searchParams` (Critical fix) |

---

## Scenario Results: 34 Edge Cases, 5 Critical

### Critical (fixed immediately)

**[C1] viewer role — blank dashboard on login**
- Root cause: `viewer` org role only had `organization/member: ['read']` — missing `project/task: ['read']`
- Impact: Viewer logs in, sees nothing, thinks app is broken
- Fix: Added `project: ['read'], task: ['read']` to Better Auth org plugin config in phase-01

**[C2] `packages/auth-config` not in turbo.json**
- Root cause: New internal package wasn't registered in Turborepo pipeline or root workspaces
- Impact: First `npm run build` fails immediately with TypeScript resolution error
- Fix: Added Step 1b in phase-01 implementation steps

**[C3] `searchParams.view` not awaited (Next.js 15)**
- Root cause: Plan snippet used `searchParams.view` without `await` — breaking change in Next.js 15 App Router
- Impact: TasksPage throws runtime error on every render
- Fix: Changed to `async function TasksPage({ searchParams }: { searchParams: Promise<...> })` + `await`

**[C4] Timer not auto-stopping on task complete**
- Root cause: `POST /api/tasks/:id/complete` only set `completedAt` — left `time_logs` row with `ended_at IS NULL`
- Impact: Timer runs forever in DB, user's time tracking corrupted
- Fix: Added `UPDATE time_logs SET ended_at=NOW(), duration=... WHERE task_id=$id AND ended_at IS NULL` to complete endpoint spec

**[C5] DoW z-score: stddev=0 → NaN**
- Root cause: If a project has perfectly consistent traffic every Monday (stddev=0), `z = (x - mean) / 0 = NaN` → alert engine crashes silently or generates garbage alerts
- Impact: Anomaly detection either throws or generates false alerts for stable sites
- Fix: `if (stddev === 0) continue` guard before z-score calculation in phase-06

### Other Notable Fixes

- **`estimatedTime=0` division by zero** (Phase 04): Time progress UI shows `Infinity%` — guard with `estimatedTime > 0 ? ... : null`
- **Task `done` → move back → stale `completedAt`** (Phase 04): PATCH move endpoint must `SET completed_at = NULL` when new status ≠ 'done'
- **Recurring template spawn race** (Phase 02+04): 2 tabs mounting simultaneously → duplicate tasks — added `UNIQUE(recurring_template_id, start_date)` constraint + `INSERT ON CONFLICT DO NOTHING`
- **Content decay per-page loop** (Phase 06): JS iteration over 50K pages → OOM/timeout in cron — replaced with single set-based SQL using `GROUP BY page` + `HAVING` clause
- **GSC API empty day → false alert** (Phase 06): 0 impressions day (API downtime) triggers traffic_drop — skip days where `totalImpressions === 0`
- **New project <4 data points** (Phase 06): Already documented, but added explicit `return early` note and UI empty state requirement

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Google OAuth: 1 client, 3 redirect URIs | Simpler, scopes don't conflict per-flow |
| Timer: DB-backed via `time_logs.startedAt` | Already in schema (renamed from v1 `startTime`) — no new field needed |
| Alert polling: 30s setInterval | Simple enough for v2, SSE deferred to v3 |
| Content decay: set-based SQL | O(1) query instead of O(n) loop — must for production scale |
| Timeline view: CSS Grid (no library) | YAGNI — bars-only, no dependencies. Add fallback empty state for no-date tasks |

---

## Effort Revision

| Phase | Original | Revised | Reason |
|-------|----------|---------|--------|
| 01 | 8h | 9-10h | turbo.json setup + Resend config + OAuth error handling |
| 04 | 20h | 22-24h | Timer DB logic, optimistic rollback, calendar overflow, async searchParams |
| 06 | 16h | 17-18h | Set-based SQL rewrite, guard clauses, polling setup |
| Others | 45h | 45h | Unchanged |
| **Total** | **~83h** | **~89-92h** | +7-9h for critical fixes |

---

## State

Plan is **READY TO IMPLEMENT**. All 5 Critical items fixed in plan docs. 11 High items added to phase Todo lists. No architectural blockers remain.

Next step: Start Phase 01 (Auth + Workspace Foundation).

---

## Files Modified This Session

- `plans/260510-1600-v2-greenfield-rebuild/plan.md` — added feasibility review note, effort revision
- `plans/260510-1600-v2-greenfield-rebuild/phase-01-auth-workspace.md` — viewer role, turbo.json step, risk entries
- `plans/260510-1600-v2-greenfield-rebuild/phase-02-schema-redesign.md` — UNIQUE constraint on recurring_template_id+start_date
- `plans/260510-1600-v2-greenfield-rebuild/phase-04-task-management-v2.md` — searchParams async, timer auto-stop, estimatedTime guard, completedAt clear, calendar overflow, Todo updates
- `plans/260510-1600-v2-greenfield-rebuild/phase-06-analytics-intelligence.md` — stddev guard, set-based SQL, alert polling, Todo updates
