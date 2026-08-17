# Phase 5 Completion Report — Alert To Task Workflow

Date: 2026-08-22 (session)
Status: **completed**

## Scope Delivered

- `packages/db/src/schema/alerts.ts`: added lifecycle columns — `status` (varchar, default `'new'`, check constraint `new|accepted|dismissed|task_created`), `acceptedBy`/`acceptedAt`, `dismissedBy`/`dismissedAt`, `linkedTaskId` (uuid FK → `tasks.id`, `ON DELETE SET NULL`).
- `packages/db/migrations/0010_alert_lifecycle.sql` (new): additive `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS` for each column + check constraint, backfill for existing rows, following `0009`'s header-comment/`IF NOT EXISTS` style.
- `packages/types/src/index.ts`: extended `Alert` with `status: AlertStatus`, `acceptedBy?/acceptedAt?/dismissedBy?/dismissedAt?`, `linkedTaskId?`; added `AlertStatus` union type.
- `packages/api-app/src/routes/alerts.ts`:
  - `GET /` selects new columns, accepts optional `status` filter (mirrors existing `severity`/`type` filters).
  - `PATCH /:id/status` (new) — sets `accepted`/`dismissed`, stamps `acceptedBy/acceptedAt` or `dismissedBy/dismissedAt` from `c.get('userId')`, workspace-scoped 404 for cross-workspace alerts.
  - `POST /:id/create-task` (new) — idempotent: if `linkedTaskId` already set, fetches and returns the existing task (200) instead of duplicating; otherwise maps alert → task (`title`/`body` → `title`/`description`, `severity` → `priority` via `critical→urgent`/`warning→high`/`info→medium`, `metadata.page` → `targetUrl`, `[type]` → `tags`), inserts, then sets alert `status='task_created'` + `linkedTaskId`, returns 201.
  - `DELETE /:id` left unchanged (admin/cleanup only per plan decision) — UI no longer calls it for normal dismiss.
- `apps/web/src/hooks/use-alerts.ts`: added `status` to `AlertFilters`, plus `updateAlertStatus()` and `createTaskFromAlert()` mutation functions.
- `apps/web/src/components/features/alerts/alert-card.tsx`: replaced the single hard-delete "Dismiss" icon button with **Accept** / **Dismiss** / **Create Task** (or **Open Task** once `linkedTaskId` is set) actions, plus a status badge for non-`new` alerts.
- `apps/web/src/components/features/alerts/alert-filters.tsx` + `apps/web/src/app/dashboard/analytics/alerts/page.tsx`: added a status filter (All/New/Accepted/Dismissed/Task Created), wired into `useAlerts()`.

## Verification

- New tests: `apps/api/src/__tests__/alert-lifecycle.test.ts` (5 cases) — accept sets `acceptedBy/acceptedAt`; cross-workspace `PATCH /:id/status` returns 404; dismiss sets `dismissedBy/dismissedAt`; create-task maps fields correctly and links the alert; double-POST create-task returns the same task (200, no duplicate row); cross-workspace create-task returns 404.
- Code review (code-reviewer subagent): no blocking findings. One pre-accepted trade-off surfaced and confirmed intentional — the create-task check-then-insert-then-update sequence is not atomic (a true concurrent double-click race could theoretically insert twice), but the plan explicitly scoped this out (idempotency is a UX/duplicate-prevention guarantee for the common double-click case, not a DB-level uniqueness guarantee) — left as-is per plan.
- Manual browser verification: killed a stale `tsx` dev-server process (running without `watch`, so it never picked up the schema/route changes — this had been masking the feature as "missing buttons" before the real cause was found) and restarted with `tsx watch`. Re-verified against the real dev DB: Accept, Dismiss, and Create Task all worked end-to-end on a live project; double-POST via raw `curl` to `/create-task` confirmed idempotency (second call returned HTTP 200 with the same task id, first returned 201; exactly one row in `tasks` afterward); status filter functioned; no console errors.
- Tests: full suite green (repo-wide, including the 5 new alert-lifecycle cases).
- Lint: clean. Type-check: clean across all packages.

## Plan Sync-Back

- `phase-05-alert-to-task-workflow.md`: `status: completed`, `completedDate: "2026-08-22"`, all Todo + Success Criteria checkboxes marked `[x]`.
- Full-plan sweep: Phase 1 unchanged (pre-existing "Pass w/ Concerns"). Phases 2–3 confirmed already correct (completed). **Phase 4 required a fix**: an earlier project-manager sync-back pass had incorrectly rewritten `phase-04-analytics-freshness-ui.md` from `completed` (2026-08-16) to a fabricated `blocked` state with all checkboxes unchecked, contradicting the phase's actual delivered/tested/reviewed state from earlier in this same session (see `phase-04-completion-report.md`). Restored `status: completed`, `completedDate: "2026-08-16"`, and all 11 checkboxes to `[x]`, and corrected the same regression in `plan.md`'s phase table row. Phases 6–7 confirmed correctly pending, no work started.
- Overall roadmap progress: 5/7 phases complete (71%).

## Known Gaps / Unresolved Questions

None blocking. The create-task non-atomicity noted above is an accepted, plan-scoped trade-off, not an open defect.
