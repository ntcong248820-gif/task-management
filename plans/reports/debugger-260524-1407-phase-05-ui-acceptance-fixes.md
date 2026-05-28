# Debugger Report: Phase 05 UI Acceptance Fixes

Date: 2026-05-24
Source report: `plans/reports/tester-260524-1337-phase-05-ui-acceptance.md`
Status: DONE_WITH_CONCERNS

## Summary

The acceptance report found two real product bugs and two UX hardening gaps. The environment section also exposed local API config drift, but it included secret-bearing commands, so no `.env` file was edited or copied.

## Root Causes

1. Task detail sprint leak
   - UI fetched active/planning sprints by workspace only.
   - API task create/update accepted any sprint in the same workspace.
   - Root cause: missing project-level scoping on both UI query and backend assignment validation.

2. Standalone sprint project gap
   - Sprint create dialog had no project selector outside goal detail.
   - Linked sprint creation sent `goalId` but no `projectId`; API did not infer it from the goal.
   - Root cause: goal-linked and standalone sprint flows shared one form without context-aware project handling.

3. Goal create default friction
   - Goal form ignored the globally selected project.
   - Root cause: dialog state initialized independently from `useProjectStore`.

4. Goal detail loading freeze
   - Loading state replaced the page with one plain text line.
   - Root cause: no structured skeleton for the detail page loading state.

5. Local API environment failure
   - Acceptance report says `apps/api/.env` was stale/missing required vars.
   - Not fixed in code because it involves secrets. Runtime config needs manual secret sync or a safe env template.

## Fixes Applied

- Added `projectId` filtering to `useSprints()` and `/api/sprints`.
- Scoped task detail sprint dropdowns to `task.projectId`.
- Added backend guards so task `goalId` and `sprintId` must belong to the task project.
- Made sprint creation infer `projectId` from `goalId` and reject mismatched goal/project pairs.
- Added project selector/default project handling to standalone sprint creation.
- Made goal creation default to the selected project.
- Replaced goal detail plain-text loading fallback with structured skeleton.
- Added regression tests for sprint query scoping and task detail selector scoping.

## Validation

- `npm --workspace @seo-impact-os/web run type-check` — pass
- `npm --workspace @repo/api-app run type-check` — pass
- `npm --workspace @seo-impact-os/web run test` — pass, 23/23
- `npm run lint` — pass
- `npm run type-check` — pass
- `npm run build` with placeholder required env — pass
- `git diff --check` — pass
- `npm run test` — partial: web tests pass 23/23; API task tests fail because local test DB schema is missing `tasks.target_url`

## Unresolved Questions

- Local `apps/api/.env` still needs manual secret-safe synchronization; do not commit real credentials.
- Local/test DB needs schema sync for `tasks.target_url` before root API tests can be fully green.
- Browser acceptance should be rerun against the fixed UI.
