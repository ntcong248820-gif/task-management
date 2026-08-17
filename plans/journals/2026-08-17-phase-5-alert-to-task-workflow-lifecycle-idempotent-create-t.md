---
title: "Phase 5 Alert To Task Workflow — lifecycle, idempotent create-task, stale-dev-server detour"
date: 2026-08-17
summary: "Alert lifecycle (accept/dismiss/create-task) shipped; caught stale tsx dev server masking the feature and a subagent's plan-doc corruption of Phase 4"
---

# Phase 5 Alert To Task Workflow — lifecycle, idempotent create-task, stale-dev-server detour

## What happened

Implemented Phase 5 of the SEO Impact OS data-trust roadmap: alerts gained a
lifecycle (`new` → `accepted` / `dismissed` / `task_created`) replacing
hard-delete for the normal dismiss flow, plus a one-click, idempotent
"Create Task" action that maps alert fields into a new task and links back
to the alert via `linkedTaskId` (`ON DELETE SET NULL`).

Backend: `packages/db/src/schema/alerts.ts` + new migration
`0010_alert_lifecycle.sql` (additive, `IF NOT EXISTS`, check constraint,
backfill). `packages/api-app/src/routes/alerts.ts` gained
`PATCH /:id/status` and `POST /:id/create-task` (idempotent — checks
`linkedTaskId` first, returns the existing task with 200 on repeat calls
instead of duplicating). Severity maps to task priority
(`critical→urgent`, `warning→high`, `info→medium`). The legacy
`DELETE /:id` route was left untouched, admin/cleanup only.

Frontend: `use-alerts.ts` gained `updateAlertStatus`/`createTaskFromAlert`;
`alert-card.tsx` replaced the old hard-delete Dismiss button with
Accept/Dismiss/Create Task (or Open Task) actions and a status badge;
filters gained a status dimension.

Tests: 5 new cases in `alert-lifecycle.test.ts` covering accept, dismiss,
create-task field mapping, double-POST idempotency, and workspace scoping
— all passing. Code review found no blocking issues; the one trade-off
(create-task's check-then-insert-then-update isn't atomic under a true
concurrent double-click) was already scoped by the plan as a UX-level
duplicate-prevention guarantee, not a DB-level uniqueness one, so left as-is.

Two real debugging detours during manual verification:

1. After seeding a test alert, Accept/Dismiss buttons were missing from
   the UI even though the backend code was correct. `GET /api/alerts`'s
   network response was missing all the new fields entirely. Root cause:
   the running API dev-server process (PID 8209) was a stale `tsx`
   process started *before* the Phase 5 code existed, launched without
   `watch` mode, so it never picked up the changes. Killed the stale
   process, restarted with the project's real `tsx watch` script, and the
   feature worked immediately. A frontend bug that turned out to be a
   process-hygiene issue, not a code issue.

2. A `project-manager` subagent's plan-sync-back pass, run earlier this
   session for Phase 4, corrupted `phase-04-analytics-freshness-ui.md` —
   rewriting a genuinely completed, tested, and reviewed phase from
   `status: completed` (2026-08-16) to a fabricated `status: blocked` with
   an invented `blockedReason` and all 11 checkboxes reset to unchecked.
   Caught this by diffing against known session history (the phase-04
   completion report and journal entry already existed) instead of
   trusting the subagent's summary at face value. Restored the correct
   frontmatter and checkboxes, and fixed the same regression that had
   leaked into `plan.md`'s phase table row.

## Decision

- Idempotency for create-task is enforced at the application level
  (`linkedTaskId` check-first), not via a DB unique constraint. Accepted
  as sufficient for the double-click case the plan actually cares about.
- Subagent-produced plan-state changes are not trusted without
  cross-checking against direct evidence (git diff, existing
  reports/journals) before being propagated further (e.g. into commits
  or user-facing reports).

## Next steps

- Phase 6 (Operator Reporting) and Phase 7 (Team Ops Expansion Gates)
  remain pending — roadmap now 5/7 phases complete (71%).
- `docs/codebase-summary.md` and `docs/project-roadmap.md` updated for
  the new alert API/hook surface.
- Commit and push via `/ak:git cp` still pending.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
