# Project Roadmap

> **Last Updated:** 2026-05-24
> **Overall Progress:** v2 Phases 01-06 complete. Phase 07 Analytics Dashboards v2 is next; root test requires local Postgres for API integration tests.

## v2 Greenfield Rebuild

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Auth + Workspace Foundation | Done | Better Auth email/password, workspace/org roles, auth pages, Next auth handler, dashboard layout guard, Hono workspace guard. Live signup -> workspace -> dashboard smoke passed. Google login, email verification, password reset, and invite email deferred |
| 2 | Data Schema Redesign | Done | UUID business schema applied to production, workspace-scoped projects/tasks/connections, goals/sprints/templates/alerts, adapted GSC/GA4 sync contracts |
| 3 | UI Shell Redesign | Done | New dashboard shell, grouped sidebar, mobile Sheet nav, workspace/project selectors, alert/user controls, placeholder routes, and task `?view=` tabs |
| 4 | Task Management v2 (Multi-View) | Done (2026-05-23) | Board/Timeline/Table/Calendar views; DB-backed timer; task filters; Kanban drag & drop; TanStack Table; CSS Grid Gantt-lite; template spawn with idempotent constraints. Post-release: fixed UUID regex, target_url migration, DB tracking table — production verified 2026-05-23 |
| 5 | Goals & Sprint Management | Done (2026-05-24) | Goals/sprints CRUD, project-scoped goal progress, sprint state actions, goal/sprint selectors in task detail, sprint-filtered task board links, workload chart. Review fixes: Select sentinels, query-preserving view tabs, Zod schema build compatibility |
| 6 | Analytics Intelligence | Done (2026-05-24) | Z-score anomaly alerts (DoW-normalized, 8-week history), content decay detection (set-based SQL), cross-source correlation (correlated_drop + source_discrepancy), rule-based recommendations, per-user alert read tracking via join table, weekly digest job, in-app alerts page, NotificationBell 30s polling, dashboard digest card. Review fixed: cross-workspace GSC data isolation, SQL-level unreadOnly filter, read-all bulk cap |

### Phase 01 Delivery Notes
- Shared auth package at `packages/auth-config`
- Better Auth email/password only; signup auto-signs in and continues to workspace create/select
- Workspace name is stored client-side until workspace create/select
- Better Auth Google login, email verification, password reset, and invite email are deferred for internal MVP
- OAuth tokens are encrypted; GSC/GA4 OAuth state is HMAC signed and bound to the active session/workspace
- Validation passed: root type-check, web tests `16/16`, lint pass, web build pass
- Production smoke passed on 2026-05-19: signup, workspace creation, dashboard API auth context

### Phase 02 Delivery Notes
- Business tables reset to UUID primary keys and Better Auth workspace IDs (`organization.id` text)
- `gsc_connections` and `ga4_connections` replace legacy `oauth_tokens`, `gsc_sites`, and `ga4_properties`
- Analytics fact tables keep `project_id` only; workspace access resolves through `projects`
- `tasks` now supports goals, sprints, assignees/reporters, recurring templates, and second-based estimates
- Local DB backup before reset: `/tmp/seo-impact-os-phase02-20260514-084302/seo_impact_os_before_phase02.sql`
- Validation passed: root type-check, forced tests `44/44`, lint pass with no warnings, production build pass with local placeholder env
- Production schema reconcile completed on 2026-05-19 via `packages/db/migrations/0006_phase02_v2_schema_reconcile.sql`; v1 business tables preserved as `*_legacy_v1_20260519`
- Production authenticated smoke passed: `GET /api/projects` -> `200`, `GET /api/tasks` -> `200`

### Phase 03 Delivery Notes
- New dashboard shell with grouped sidebar (Workspace, Projects, Analytics, Settings)
- Mobile Sheet navigation + workspace/project selectors in header
- Placeholder routes for all sections (goals, sprints, analytics subsections, settings subsections)
- Task view shell with view switcher tabs (Board, Timeline, Table, Calendar)
- Alert controls + user menu in header
- Phase 3 complete: all shell components coded, local validation passed, browser/live smoke pending

### Phase 04 Delivery Notes (2026-05-22)
- **API Routes:** Rewritten `tasks.ts` with multi-view filters (status, search ILIKE, sprintId, assigneeId, limit/offset); `/complete` auto-stops timers; `/move` clears completedAt when leaving 'done'
- **Timer System:** Rewritten `time-logs.ts` with DB-backed `/start` (enforces single active per user), `/stop`, and manual entry validation; `useTimerStore` rewritten to sync from DB with localStorage persistence
- **Task Templates:** New `task-templates.ts` route with CRUD + idempotent `/spawn` using `ON CONFLICT (recurring_template_id, start_date) DO NOTHING`
- **Database:** Migration 0007 adds `tasks.target_url TEXT` column for Phase 07 page→task linking
- **Components:** Implemented Kanban board (drag & drop with @dnd-kit), task detail slide-over (Sheet + blur-to-save inline edit), Timeline (CSS Grid Gantt-lite with month nav), Table (@tanstack/react-table sortable), Calendar (month view with 3-chip limit + Popover overflow), task filters bar, view switcher tabs
- **SWR Hooks:** New `use-tasks.ts` with `useTasks()`, `useTask()`, `useTaskStats()`, `useTaskTemplates()` with stable cache keys
- **Legacy:** TaskCard.tsx, TimerWidget.tsx marked @ts-nocheck (cleanup deferred to Phase 07)

### Phase 05 Delivery Notes (2026-05-24)
- **API Routes:** Added `goals.ts` and `sprints.ts` with workspace/project ownership checks, batch goal progress, sprint start/complete actions, and task listing by sprint.
- **Frontend:** Added goals list/detail, sprints list/planning, goal create dialog, sprint cards, workload chart, and SWR hooks for goals/sprints.
- **Task Linking:** Task detail panel can assign goal and sprint. Sprint cards link to `/dashboard/tasks?view=board&sprintId=...`; create task dialog preserves the active sprint filter.
- **Review Fixes:** Replaced empty Radix Select values with explicit sentinels, preserved query params while switching task views, and split refined Zod schemas so update schemas compile/build.
- **Validation:** `npm run lint`, `npm run type-check`, web tests `20/20`, and placeholder-env `npm run build` pass. Root `npm run test` currently needs local Postgres on `localhost:5432` for API integration tests.

### Phase 06 Delivery Notes (2026-05-24)
- **Alert Engine:** Z-score anomaly detection (day-of-week normalized, 8-week same-DoW history, `MIN_DATA_POINTS=4`), content decay (30% impression drop over 7-day windows via set-based SQL), cross-source correlated drop + source discrepancy (GSC+GA4 z-score), rule-based recommendations (4 rules: optimize_meta, refresh_content, audit_decaying_pages, build_links)
- **API Routes:** `GET/PATCH/DELETE /api/alerts` with per-user read state via `alert_reads` join table; `GET /api/digest/latest` for weekly digest; cron routes `/api/cron/run-alerts` and `/api/cron/weekly-digest` guarded by `verifyCronSecret`
- **Schema:** New `workspace_digests` table with `UNIQUE(workspaceId, weekStart)`; `alerts` type constraint extended with `correlated_drop` + `source_discrepancy`
- **Frontend:** Alerts page with severity/type/unread filters; `AlertCard` with expand/collapse metadata; `NotificationBell` with 30s polling; dashboard `WeeklyDigestCard` with WoW % badges and keyword deltas; `AlertsOverviewCard` unread count
- **Review Fixes:** C1 — weekly digest GSC queries scoped to workspace project IDs (cross-tenant isolation); C2 — `unreadOnly` pushed to SQL `WHERE isNull(alertReads.id)` instead of in-memory filter after LIMIT; H1 — `PATCH /read-all` capped at 500 rows; H2 — limit/offset sanitized with `Math.min/max`
- **Validation:** Lint, type-check, and build all pass clean

## Phase Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Auth + Workspace Foundation | Done | 100% |
| 2 | Data Schema Redesign | Done | 100% |
| 3 | UI Shell Redesign | Done | 100% |
| 4 | Task Management v2 | Done | 100% |
| 5 | Goals & Sprint Management | Done | 100% |
| 6 | Analytics Intelligence | Done (2026-05-24) | 100% |
| 7 | Analytics Dashboards v2 | Planned | 0% |

## Legacy Phase 7 Hardening Backlog

This section predates the v2 greenfield phase numbering. Keep it as production-hardening backlog, not as the current v2 Phase 07 Analytics Dashboards status.

**Goal:** Production-ready with test coverage, security, and stable deployment.

### Week 1 — Testing & Security (Complete)
- [x] Configure Vitest for api + web
- [x] Write unit tests for API routes (target: 30+ tests)
- [x] Implement OAuth token encryption (`ENCRYPTION_KEY`)
- [x] Add Zod request validation
- [x] Add rate limiting middleware
- [x] Frontend Architecture refactor (SWR caching, Zustand store, Error Boundary)

### Session 2026-05-01 — Database Migration & Infrastructure
- [x] Migrate to new Supabase project (old project unrecoverable)
- [x] Update Database URL with new pooler connection (port 6543)
- [x] Set up GitHub Actions secrets (`CRON_SECRET`) and variables (`APP_URL`)
- [x] Verify GSC + GA4 cron endpoints return 200
- [x] Verify OAuth callbacks work in production
- [x] Update API URL config fallback (now empty string for same-origin in production)
- [x] Resolve `last_synced_at` schema discrepancy (manual ALTER TABLE)

### Week 2 — Integration Tests + Performance
- [ ] E2E OAuth flow tests (GSC + GA4)
- [ ] Cron job integration tests (verify synced count + error details in response)
- [ ] DB indexes on `gsc_data`, `ga4_data`, `tasks`
- [ ] Pagination for large lists
- [ ] Query optimization with EXPLAIN ANALYZE

### Week 3 — Docs + Export
- [ ] Swagger/OpenAPI documentation
- [ ] CSV export for analytics data
- [ ] Chart export (PNG)
- [ ] User guide

### Week 4 — Production Verification
- [ ] Sentry error monitoring
- [ ] UptimeRobot for uptime monitoring
- [ ] Verify cron jobs run in production
- [ ] Load testing
- [ ] Final security audit

## Known Issues (as of 2026-05-01)

| Issue | Severity | Status |
|-------|----------|--------|
| Old Supabase project (jtdeuxvwcwtqzjndhrlg) paused 304+ days | High | Resolved — migrated to new project (hipvuijrwcmdoeirtswf) |
| CORS errors blocking Vercel → Render calls | High | Fixed (explicit CORS origin) |
| GSC + GA4 shared redirect URI collision | Medium | Fixed (separate URIs) |
| Dashboard using hardcoded localhost projectId | Medium | Fixed |
| OAuth token not encrypted at rest | Medium | Fixed — Phase 7 Week 1 |
| `last_synced_at` column missing from schema migration | Medium | Fixed — manual ALTER TABLE (now in schema) |

## Removed from Scope

- Ahrefs integration
- Backlinks monitoring
- Competitor analysis
- Multi-tenant SaaS features

## Future Considerations (Post-MVP)

- Slack/email notifications for traffic drops
- Custom correlation window per task
- Bulk task import from CSV
- Team collaboration features
