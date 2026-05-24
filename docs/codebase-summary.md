# Codebase Summary

> Quick map of all modules. Read before implementing anything.

## packages/api-app

Shared Hono application — imported by both `apps/web` (production) and `apps/api` (local dev).

| File/Dir | Purpose |
|----------|---------|
| `src/app.ts` | Hono app factory — CORS, rate limiting, route registration, validateEnv() |
| `src/routes/projects.ts` | Workspace-scoped CRUD `/api/projects` with UUID project IDs |
| `src/routes/tasks.ts` | Workspace-scoped task CRUD + multi-view filters (status, search, sprintId, assigneeId, limit/offset); `/complete` auto-stops timer; `/move` clears completedAt; `/stats` workload counters |
| `src/routes/time-logs.ts` | User-scoped timer `/start` (DB-backed, enforces single active), `/stop` (increments task.timeSpent), and manual entry POST with Zod validation |
| `src/routes/task-templates.ts` | Template CRUD + `/spawn` (idempotent `ON CONFLICT DO NOTHING` on recurringTemplateId+startDate) |
| `src/routes/goals.ts` | Phase 05 workspace/project-scoped goals CRUD + batch task progress |
| `src/routes/sprints.ts` | Phase 05 sprint CRUD + start/complete actions + sprint task listing |
| `src/routes/analytics.ts` | Combined GSC + GA4 metrics |
| `src/routes/correlation.ts` | Task-traffic correlation data |
| `src/routes/rankings.ts` | Keyword position tracking |
| `src/routes/urls.ts` | URL performance + decline detection |
| `src/routes/keywords.ts` | Keyword detail + SERP history |
| `src/routes/diagnosis.ts` | AI rule-based diagnosis |
| `src/routes/integrations/` | GSC + GA4 OAuth + sync routes backed by connection tables |
| `src/routes/cron/` | HTTP endpoints for GitHub Actions cron trigger (`sync-gsc`, `sync-ga4`) with Bearer token auth |
| `src/utils/signed-oauth-state.ts` | HMAC signed OAuth state bound to project/user/workspace |
| `src/jobs/sync-gsc.ts` | GSC sync logic using `gsc_connections` and UUID project IDs |
| `src/jobs/sync-ga4.ts` | GA4 sync logic using `ga4_connections` and `engagementRate` |
| `src/schemas/` | Zod validation schemas (project-schema.ts, task-schema.ts, goal-schema.ts) |
| `src/utils/crypto-tokens.ts` | AES-256-GCM encrypt/decrypt for OAuth tokens |
| `src/utils/token-refresh.ts` | Decrypt + refresh Google OAuth tokens |
| `src/utils/validate-env.ts` | Startup env validation (ENCRYPTION_KEY hex check, Better Auth + prod vars, OAuth warnings) |
| `src/utils/verify-cron-secret.ts` | Timing-safe CRON_SECRET comparison (crypto.timingSafeEqual) |
| `src/utils/logger.ts` | Structured logging utility |

## packages/auth-config

Shared Better Auth config used by web + API.

| File/Dir | Purpose |
|----------|---------|
| `src/index.ts` | Better Auth instance, email/password-only auth, organization plugin, workspace ACL |
| `src/permissions.ts` | Workspace roles (`owner`, `admin`, `member`, `viewer`) and ACL rules |

## apps/api

Thin dev-only server wrapper — imports `app` from `@repo/api-app` and serves it via `@hono/node-server` on port 3001. Not deployed to production (local development only). Type-check scope intentionally includes only `src/index.ts`; legacy duplicate API files under `apps/api/src/**` are not the canonical API surface.

| File/Dir | Purpose |
|----------|---------|
| `src/index.ts` | Node server entry point — serves `@repo/api-app` on `API_PORT` (default 3001) |

## apps/web

| File/Dir | Purpose |
|----------|---------|
| `src/app/api/[[...route]]/route.ts` | Hono catch-all route handler — mounts `@repo/api-app` at `/api` in production |
| `src/app/api/auth/[...all]/route.ts` | Better Auth Next.js handler |
| `src/app/(auth)/login/page.tsx` | Login page |
| `src/app/(auth)/signup/page.tsx` | Signup page with pending workspace name |
| `src/app/(auth)/workspace/page.tsx` | Workspace create/select page |
| `src/app/dashboard/page.tsx` | Phase 03 proactive overview shell |
| `src/app/dashboard/tasks/` | Phase 04 multi-view task hub with `?view=board|timeline|table|calendar` (default: board) |
| `src/app/dashboard/goals/` | Phase 05 goals list/detail UI with progress and linked sprints |
| `src/app/dashboard/sprints/` | Phase 05 sprint planning UI with status actions, workload, and task-board links |
| `src/app/dashboard/analytics/` | Phase 03 analytics placeholders (`overview`, `keywords`, `pages`, `alerts`) |
| `src/app/dashboard/settings/` | Phase 03 settings placeholders (`projects`, `team`, `integrations`) |
| `src/components/ui/` | shadcn/ui primitives |
| `src/components/layout/` | Phase 03 shell components: sidebar, header, selectors, mobile sheet, nav groups |
| `src/components/features/tasks/` | Phase 04/05 task components: multi-view task UI, query-preserving tabs, goal/sprint assignment in detail panel, create dialog with sprint defaults |
| `src/components/features/goals/` | Phase 05 goal cards/dialogs, sprint cards, and workload chart |
| `src/components/features/` | Feature components (tasks, goals, analytics, rankings, urls, dashboard) |
| `src/components/error-boundary.tsx` | React error boundary for graceful error handling |
| `src/hooks/use-tasks.ts` | Phase 04 SWR hooks: `useTasks()`, `useTask()`, `useTaskStats()`, `useTaskTemplates()` |
| `src/hooks/use-goals.ts` | Phase 05 SWR hooks and mutations for goals |
| `src/hooks/use-sprints.ts` | Phase 05 SWR hooks and mutations for sprints |
| `src/hooks/` | Custom React hooks with SWR caching (useAnalyticsData, useRankingsData, useURLsData, useDiagnosisData, useKeywordDetailData) |
| `src/stores/useTimerStore.ts` | Phase 04 rewrite: DB-backed timer state via `/start` `/stop` endpoints, localStorage persist, syncFromDb() |
| `src/stores/` | Zustand stores (`use-project-store`, `use-workspace-store`, `use-alert-store`) |
| `src/lib/api-client.ts` | Shared SWR fetcher + apiPost for all data hooks |
| `src/lib/auth-client.ts` | Better Auth client with `organizationClient` plugin |
| `src/lib/select-values.ts` | Select sentinel helpers for Radix Select values that represent all/none states |
| `src/app/dashboard/layout.tsx` | Dashboard session + workspace redirect guard |
| `src/types/` | Frontend-only TypeScript types |

## packages/db

| File/Dir | Purpose |
|----------|---------|
| `src/schema/projects.ts` | Workspace-scoped projects with UUID IDs |
| `src/schema/tasks.ts` | Task v2 table with UUID IDs, workspace, goal/sprint/template links, `target_url TEXT` (Phase 04), recurring fields |
| `src/schema/time-logs.ts` | Time logs with UUID task IDs, workspace ID, user ID, started/ended timestamps, duration |
| `src/schema/auth-schema.ts` | Better Auth generated schema tables |
| `src/schema/gsc-connections.ts` | GSC OAuth connection + sync status per project |
| `src/schema/ga4-connections.ts` | GA4 OAuth connection + sync status per project |
| `src/schema/goals.ts` | Project-scoped goals; current value is derived, not stored |
| `src/schema/sprints.ts` | Workspace sprints/campaign periods with optional project scope |
| `src/schema/task-templates.ts` | Recurring task templates |
| `src/schema/alerts.ts` | Workspace/project alerts with severity/type metadata |
| `src/schema/alert-reads.ts` | Per-user alert read tracking |
| `src/schema/gsc_data.ts` | Raw GSC data with UUID project FK, no workspace column |
| `src/schema/gsc_data_aggregated.ts` | Aggregated GSC metrics with numeric CTR/position |
| `src/schema/ga4_data.ts` | GA4 data with `engagementRate`, conversion/source/medium/device dimensions |
| `src/index.ts` | DB client export |

## packages/types

Shared TypeScript interfaces: `Project`, `Task`, `TimeLog`, `Goal`, `Sprint`, `Alert`, `GscConnection`, `Ga4Connection`, `GscData`, `Ga4Data`, etc.

## Root-level Scripts

| File | Purpose |
|------|---------|
| `scripts/add-ga4-property.ts` | Manually add GA4 property |
| `scripts/check-and-sync.ts` | Debug: check integration status + sync |
| `scripts/discover-and-sync.ts` | Discover GA4 properties + sync |
| `scripts/encode-db-url.ts` | Encode DB URL for env vars |
| `setup-all-projects.sh` | One-time project setup script |

## Other Directories

| Dir | Purpose |
|-----|---------|
| `docs/` | ClaudeKit-standard docs + legacy subdirs |
| `plans/` | Implementation plans + agent reports |
