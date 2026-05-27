---
phase: 2
title: "Projects Settings"
status: complete
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Projects Settings

## Overview

Replace the Projects settings placeholder with real workspace-scoped project management and first-project onboarding.

## Requirements

- Functional: list, create, edit, deactivate/reactivate, delete with confirmation, and select current project.
- Functional: project create form supports `name`, `domain`, `description`, `color`, `isActive`.
- Functional: when the first project is created, update `useWorkspaceStore.projects` and `useProjectStore.selectedProjectId`.
- Non-functional: use existing `/api/projects`; no duplicate backend route; handle empty, loading, error, and mutation states.

## Architecture

`SettingsProjectsPage` becomes a client page that composes smaller components. Project mutations call Hono `/api/projects`, then refresh `useWorkspaceStore.fetchProjects()` and selected project state.

## Related Code Files

- Modify: `apps/web/src/app/dashboard/settings/projects/page.tsx`
- Create: `apps/web/src/hooks/use-projects-settings.ts`
- Create: `apps/web/src/components/features/settings/project-form-dialog.tsx`
- Create: `apps/web/src/components/features/settings/project-settings-table.tsx`
- Read: `apps/web/src/stores/use-workspace-store.ts`
- Read: `apps/web/src/stores/use-project-store.ts`
- Read: `packages/api-app/src/routes/projects.ts`
- Read: `packages/api-app/src/schemas/project-schema.ts`
- Read: `packages/db/src/schema/projects.ts`

## Implementation Steps

1. Build `use-projects-settings.ts` wrappers around existing project endpoints.
2. Convert `settings/projects/page.tsx` to a client page with:
   - header action: New Project
   - table/list of projects
   - active status and selected-project indicator
   - empty state with create CTA
3. Add create/edit dialog with Zod-compatible client validation.
4. On create success:
   - refetch workspace projects
   - select the created project if no project is selected
   - show a toast with next action: connect data sources
5. Add delete confirmation and guard selected-project cleanup after delete.
6. Keep the existing `/dashboard/projects` redirect shim.

## Success Criteria

- [x] User can create a project from `/dashboard/settings/projects`.
- [x] Header ProjectSelector shows the new project without full page reload.
- [x] Edit updates name/domain/color/description/status.
- [x] Delete removes the project and clears/reselects selected project safely.
- [x] Tasks empty state "Create project" flow lands on a working page.

## Risk Assessment

- Risk: `projects_workspace_domain_unique` allows duplicate null domains but blocks duplicate real domains per workspace. Mitigation: surface duplicate-domain errors clearly.
- Risk: deleting a project cascades connection/data/task rows. Mitigation: destructive confirmation must state impact before delete.
