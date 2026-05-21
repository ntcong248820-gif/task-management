---
title: "Code Reviewer Report - Phase 01/02 Readiness for Phase 03"
date: 2026-05-19
time: "22:23 +07"
type: code-review
scope: "Auth simplification, production signup smoke, Phase 02 schema readiness before Phase 03 UI Shell"
target_commit: "756d12a feat(auth): simplify internal login flow"
plan: "plans/260510-1600-v2-greenfield-rebuild/"
skills: "/ck:code-review"
---

# Code Reviewer Report - Phase 01/02 Readiness for Phase 03

## Verdict

**NOT READY for Phase 03 clean start.**

Phase 01 auth path is now live-usable: signup works, workspace creation works, user can enter dashboard. Local web validation also passes.

Blocker is Phase 02 production schema drift: deployed API code expects v2 workspace-scoped business tables, but production DB still has old v1 `projects` and `tasks` shapes. Auth is fixed; app data APIs are still failing in production.

## Findings

### 1. BLOCKER - Production business schema is still old v1, while deployed API expects v2

Evidence:

- Runtime logs after authenticated use show repeated 500s:
  - `[API:Projects] Error fetching projects`
  - `[API:Tasks] Error fetching tasks`
- API code reads workspace-scoped v2 columns:
  - `packages/api-app/src/routes/projects.ts:23` gets `workspaceId`
  - `packages/api-app/src/routes/projects.ts:27` filters `projects.workspaceId`
  - `packages/api-app/src/routes/tasks.ts:19` gets `workspaceId`
  - `packages/api-app/src/routes/tasks.ts:26-30` filters `tasks.workspaceId`
- Source schema expects v2 shape:
  - `packages/db/src/schema/projects.ts:3-15` uses UUID `id`, `workspace_id`, `is_active`, workspace indexes
  - `packages/db/src/schema/tasks.ts:8-52` uses UUID `id`, `workspace_id`, `goal_id`, `sprint_id`, `reporter_id`, recurring fields, v2 indexes/checks
- Production DB inspection showed old v1 columns:
  - `projects`: `id,name,client,domain,status,description,created_at,updated_at`
  - `tasks`: `id,project_id,title,description,status,task_type,priority,assigned_to,time_spent,estimated_time,completed_at,expected_impact_start,expected_impact_end,actual_impact,tags,notes,created_at,updated_at`
  - Missing v2 tables/columns: `workspace_id`, UUID IDs, `goals`, `sprints`, `task_templates`, v2 task scheduling/recurring fields

Impact:

- Dashboard can load shell, but authenticated business endpoints are broken.
- Phase 03 UI Shell will build on a broken data/API foundation unless Phase 02 production schema is fixed first.

Recommended fix:

- Do not proceed to Phase 03 as "ready" until prod DB has the v2 Phase 02 schema.
- Preferred: repair migration source of truth, then apply to production.
- Short-term if needed: direct SQL patch can unblock prod, but must be followed by committed migration reconciliation.

### 2. IMPORTANT - Migration source of truth drift from production

Evidence:

- Better Auth tables were created by direct SQL hotfix in production because `drizzle-kit push` crashed during schema introspection.
- `drizzle-kit push` failure observed:
  - `TypeError: Cannot read properties of undefined (reading 'replace')`
  - location: `drizzle-kit/bin.cjs`
- Committed migration journal still only tracks older migrations in `packages/db/migrations/meta/_journal.json`.
- Latest committed migration history does not represent the current required production state for Better Auth tables and v2 business schema.

Impact:

- Fresh environments will not reliably reproduce production.
- Future deploys/migrations may behave differently from current production.
- A second manual prod patch would deepen drift unless captured in migrations.

Recommended fix:

- Add or regenerate a migration that represents:
  - Better Auth tables: `"user"`, `"session"`, `"account"`, `"verification"`, `"organization"`, `"member"`, `"invitation"`
  - v2 business schema: `projects`, `tasks`, `goals`, `sprints`, `task_templates`, and related indexes/checks
- Re-run migration tooling locally against a disposable DB before touching production again.

### 3. MEDIUM - Workspace creation ignores `setActive` failure before redirect

Evidence:

- `apps/web/src/app/(auth)/workspace/page.tsx:68` calls `authClient.organization.setActive(...)`.
- The result is not checked before `router.push('/dashboard')`.
- Existing workspace selection flow checks this correctly at `apps/web/src/app/(auth)/workspace/page.tsx:76-82`.

Impact:

- If active organization fails to set after workspace creation, user is redirected anyway.
- Dashboard guard/API can then see no active workspace and produce confusing loop or empty state.

Recommended fix:

- Mirror `selectWorkspace` behavior in `createWorkspace`:
  - capture `setActive` result
  - show error and stop loading on failure
  - only redirect after successful active org set

## Passing Evidence

Local validation, all passed:

```bash
npm --workspace @seo-impact-os/web run type-check
npm --workspace @seo-impact-os/web run test
npm --workspace @seo-impact-os/web run lint
npm --workspace @seo-impact-os/web run build
```

Result:

- Type-check exit 0.
- Tests: 5 files passed, 16 tests passed.
- Lint: no warnings/errors.
- Build: passed with dummy required env values.
- Build emitted OAuth-disabled warnings because redirect envs were omitted; non-fatal for internal email/password MVP.

Production auth smoke:

- Latest `task-management-web` Vercel deployment ready.
- Alias includes `https://task-management-web-zeta.vercel.app`.
- Unauth `HEAD /dashboard` returns 307 to `/login?redirect=/dashboard`.
- Unauth `GET /api/projects` returns 401.
- Signup POST smoke to `/api/auth/sign-up/email` returned HTTP 200 after auth table hotfix.
- User confirmed live signup and dashboard entry worked.

Production DB auth state:

- Better Auth tables exist.
- Auth counts after user smoke: user/org/member/session each had data.

## Readiness Gate for Phase 03

Minimum before moving to Phase 03:

1. Apply v2 Phase 02 business schema to production.
2. Verify authenticated `GET /api/projects` returns 200, not 500.
3. Verify authenticated `GET /api/tasks` returns 200, not 500.
4. Decide migration reconciliation path so local, Vercel, and Supabase production do not diverge further.

## Docs Impact

Docs impact: **major after fix**.

Update phase docs and journal only after production schema is actually fixed and smoke-verified. Current accurate status should be:

- Phase 01 auth: live signup/workspace smoke passed.
- Phase 02 schema: code exists, but production schema not applied.
- Phase 03 UI Shell: blocked by Phase 02 production schema drift.

## Unresolved Questions

- Fix production schema via direct SQL patch now, or first repair Drizzle migration workflow?
- Should `/workspace` stay canonical, or should it become `/workspace/select` later as the product grows?
- Should old v1 `projects/tasks` data be migrated, archived, or treated as disposable for this v2 greenfield rebuild?
