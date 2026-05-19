# Phase 03 UI Shell Redesign

**Date**: 2026-05-19
**Status**: Code complete, local validation passed, browser/live smoke pending

## What Changed

- Rebuilt the dashboard shell around the existing Phase 01 server guard.
- Added new layout components for sidebar, header, nav groups, mobile Sheet nav, workspace selector, project selector, alert bell, and user menu.
- Added Phase 03 placeholder routes for overview, tasks, goals, sprints, analytics, and settings.
- Kept Tasks as one sidebar item; view switching now happens inside `/dashboard/tasks?view=board|timeline|table|calendar`.
- Added `use-workspace-store` and `use-alert-store`; adapted `use-project-store` for nullable IDs.

## Review Notes

- Code reviewer found mobile header overflow plus Sheet/Collapsible implementation gaps.
- Fixed mobile header by hiding project selector under `sm` and shrinking selector widths.
- Added local Sheet and Collapsible wrappers and switched shell components to use them.
- Local dev smoke caught server-render issues from malformed Node `localStorage`; fixed with a server shim, guarded Zustand storage, and client-only auth header controls.
- Stale v1 component files are left unimported for now; cleanup deferred to Phase 04 task-view rebuild.

## Validation

- `npm --workspace @seo-impact-os/web run type-check`
- `npm --workspace @seo-impact-os/web run test` -> `16/16`
- `npm --workspace @seo-impact-os/web run lint`
- `npm --workspace @seo-impact-os/web run build` with local placeholder required env
- Code-reviewer re-review: no blocking findings.
- Local `HEAD /dashboard` smoke: fixed from `500 localStorage.getItem` to Phase 01 redirect behavior.

## Next Steps

- Browser smoke `/dashboard` at desktop and 375px mobile after deploy.
- Verify workspace selector and project selector with a real authenticated workspace.
- Start Phase 04 for real task board/timeline/table/calendar views.
