# System Architecture

## Overview

Monorepo (Turborepo) with two apps and multiple shared packages.

```
task-management/
├── apps/
│   ├── api/        → Local development server (port 3001, optional)
│   └── web/        → Next.js 15 + Hono App Router (port 3002, Vercel)
├── packages/
│   ├── auth-config/ → Shared Better Auth config, email helpers, workspace ACL
│   ├── api-app/    → Shared Hono application (exported to web + api)
│   ├── db/         → Drizzle ORM schema + DB client
│   ├── types/      → Shared TypeScript types
│   ├── integrations/ → Google OAuth clients + utilities
│   └── ui/         → UI component library
├── plans/          → Implementation plans & agent reports
├── docs/           → Project documentation
└── scripts/        → Utility scripts (sync, encode, etc.)
```

## Service Architecture

**Production (Vercel):**
```
Browser
  │
  ▼
Next.js + Hono (Vercel, same origin)
  │  Next.js App Router (port 3002)
  │  │  RSC + Client Components
  │  │  Zustand stores
  │  │
  │  ├─ Better Auth handler at /api/auth/[...all] (via toNextJsHandler)
  │  └─ Hono API mounted at /api (via [[...route]]/route.ts)
  │     ├─ /api/projects
  │     ├─ /api/tasks, /api/time-logs
  │     ├─ /api/goals, /api/sprints
  │     ├─ /api/alerts, /api/digest
  │     ├─ /api/analytics, /api/correlation
  │     ├─ /api/integrations/gsc/*, /api/integrations/ga4/*
  │     └─ /api/cron/sync-gsc, /api/cron/sync-ga4, /api/cron/run-alerts, /api/cron/weekly-digest
  │
  ▼ Drizzle ORM
PostgreSQL (hosted)
```

**Local Development:**
```
Browser (port 3002)
  ▼
Next.js dev server
  └─ Proxies REST calls to Hono

Hono standalone (port 3001, optional)
  ├─ DATABASE_URL, GOOGLE_*, ENCRYPTION_KEY
  └─ Sync jobs if ENABLE_CRON=true
```

**Key Change (Phase 02):** The business schema is reset for v2. Business IDs are UUIDs, `workspaceId` is Better Auth `organization.id` (`text`), GSC/GA4 connection state lives in provider-specific connection tables, and analytics rows resolve workspace access through `projects`.

**Key Change (Infra):** Web + API are collocated on same Vercel deployment. The Hono app is exported from `packages/api-app` and mounted via Next.js route handler at `/api`. Separate backend at port 3001 is for local development only.

**Key Change (Phase 01 v2):** Authentication and workspace context are centralized in Better Auth.
- `packages/auth-config` owns the Better Auth instance and workspace ACL.
- `apps/web/src/app/api/auth/[...all]/route.ts` exposes Better Auth to Next.js App Router.
- `apps/web/src/app/dashboard/layout.tsx` redirects unauthenticated users to `/login` and users without an active workspace to `/workspace`.
- `packages/api-app/src/app.ts` injects `user`, `session`, `userId`, and `workspaceId` into protected API handlers, and treats auth-related requests as public when they reach the Hono app.
- `apps/web/src/lib/auth-client.ts` enables `organizationClient`, so workspace create/invite/select methods exist on the client.

**Key Change (Phase 06):** Proactive analytics intelligence layer added.
- `packages/api-app/src/jobs/alert-engine.ts` runs Z-score anomaly detection (day-of-week normalized, 8-week history), content decay (set-based SQL), and cross-source correlation on demand.
- `packages/api-app/src/jobs/weekly-digest.ts` aggregates weekly GSC/task/alert metrics into `workspace_digests`.
- `/api/alerts` serves per-user read state via `alert_reads` left-join (no `isRead` boolean on alerts table).
- `/api/cron/run-alerts` and `/api/cron/weekly-digest` are GitHub Actions-triggered cron endpoints, guarded by `verifyCronSecret`.
- `NotificationBell` and `useAlertCount` SWR hook poll at 30s intervals for unread count.

**Key Change (Phase 05):** Goals and sprints now connect task execution to measurable objectives.
- `packages/api-app/src/routes/goals.ts` serves project-scoped goal CRUD and batch task progress.
- `packages/api-app/src/routes/sprints.ts` serves sprint CRUD, start/complete actions, and sprint task listings.
- Task detail UI can assign goal and sprint; sprint cards deep-link into `/dashboard/tasks?view=board&sprintId=...`.
- Metric progress remains deferred to analytics phases; current Phase 05 progress is task-count based.

**Key Change (Phase 07):** Deep-dive analytics dashboards with honest correlation analysis.
- `/api/analytics/*` routes serve KPIs, keyword details, page details with decay status.
- `/api/correlation/*` redesigned: no auto-calculated impact %; users select custom date ranges.
- Analytics pages at `/dashboard/analytics/*` provide keyword/URL deep dive with TanStack Tables, SWR hooks for data fetching.
- Correlation section integrates interactive date range picker + impact summary (honest framing: user selects range, not algorithm).
- GA4 source filter for cross-source insights (organic-only GSC vs all-traffic GA4 requires filtering).
- Components: KPI cards (period-over-period %), traffic trend chart (dual-axis GSC+GA4), top movers (↑↓ arrows), correlation chart with task annotations, decay status badges (🟢🟡🔴), sparklines in table rows.

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `projects` | Workspace-scoped SEO projects with UUID IDs |
| `tasks` | Task v2 with workspace, project, goal, sprint, assignee/reporter, recurring fields, and second-based estimates |
| `time_logs` | Time tracking entries per task/user/workspace |
| `goals` | Project-scoped goals; current progress is derived from analytics, not stored |
| `sprints` | Workspace sprints/campaign periods with optional project scope |
| `task_templates` | Recurring task templates |
| `alerts` | Workspace/project alerts generated by analytics intelligence |
| `alert_reads` | Per-user alert read state; `UNIQUE(alertId, userId)` |
| `workspace_digests` | Weekly SEO digest per workspace; `UNIQUE(workspaceId, weekStart)` |
| `gsc_connections` | Encrypted GSC tokens, site URL, permission level, sync status |
| `ga4_connections` | Encrypted GA4 tokens, property metadata, sync status |
| `gsc_data` | Raw GSC rows with UUID `project_id`; no direct workspace column; Phase 07 indexes: (project_id, query, date DESC), (project_id, page, date DESC) |
| `gsc_data_aggregated` | Daily aggregated GSC metrics with numeric CTR/position |
| `ga4_data` | GA4 sessions, users, engagement rate, conversions, source/medium/device data; Phase 07 index: (project_id, session_source, date DESC) |

Better Auth adds its own managed tables for user, session, account, verification, organization, member, and invitation data.

## Google OAuth Flows

Separate Google callback paths are used for GSC and GA4 integrations. Better Auth Google login is disabled for the internal MVP; app auth is email/password only.

```
GSC OAuth:
  /api/integrations/gsc/auth  →  Google  →  /api/integrations/gsc/callback

GA4 OAuth:
  /api/integrations/ga4/auth  →  Google  →  /api/integrations/ga4/callback
```

In production (Vercel), Better Auth email/password is handled by `apps/web/src/app/api/auth/[...all]/route.ts`, while GSC/GA4 callbacks are served by the Hono app mounted at `/api`. The old Next.js Google callback routes are gone.

**Token Storage & Encryption:**
- Tokens encrypted with AES-256-GCM before DB storage in `gsc_connections` / `ga4_connections`
- Uses `ENCRYPTION_KEY` env var (32-byte, stored as 64-char hex)
- Format: `{iv:tag:ciphertext}` (hex-encoded)
- Backward-compatible with unencrypted legacy tokens
- Token refresh only includes `access_token` and `refresh_token` — redirect URI not required for refresh
- Sync tracking: `last_synced_at`, `sync_status`, and `sync_error` columns on connection tables
- See `src/utils/crypto-tokens.ts` for encryption/decryption and `src/utils/token-refresh.ts` for refresh logic

**Rate Limiting:**
- `/sync` endpoints — 5 requests per minute per IP
- `/authorize` endpoints — 10 requests per minute per IP
- Protects against abuse during OAuth flows and manual sync triggers

## Data Sync (Cron Jobs)

**Production (GitHub Actions):**
- GSC sync: 7:00 PM UTC daily via `/api/cron/sync-gsc`
- GA4 sync: ~7:05 PM UTC daily via `/api/cron/sync-ga4`
- Alert engine: schedule TBD via `/api/cron/run-alerts` (Phase 06)
- Weekly digest: Monday mornings via `/api/cron/weekly-digest` (Phase 06)
- Triggered by `.github/workflows/cron-sync.yml`
- Requires `CRON_SECRET` env var (Bearer token auth)
- Response includes `{ synced: number, errors: string[] }` for monitoring
- `last_synced_at` updated on success; errors surfaced in response

**Local Development:**
- Jobs run in-process if `ENABLE_CRON=true` (uses `packages/api-app/src/jobs/sync-gsc.ts` and `sync-ga4.ts`)
- Fallback for testing without GitHub Actions

**Manual Sync:**
Available via `POST /api/integrations/gsc/sync` and `POST /api/integrations/ga4/sync`. Both routes update `last_synced_at` on success and support optional `days` parameter (1–365, clamped automatically). Status endpoint returns `last_synced_at` (or `created_at` if never synced). Response includes synced count and error details.

## Correlation Logic

- Each task has an `impact_window` (7–28 days)
- Correlation chart shades the window after task completion
- Backend computes overlap between task windows and metric changes
- Client renders multi-layer Recharts (GSC traffic + GA4 + task markers)

## Frontend State Management

| State | Store |
|-------|-------|
| Selected workspace + projects | Zustand (`use-workspace-store`) |
| Selected project | Zustand (`use-project-store`) |
| Alert shell state | Zustand (`use-alert-store`; Phase 06 live: `fetchAlerts()` hits `/api/alerts/count`, 30s SWR polling via `useAlertCount`) |
| Task views | Phase 04 multi-view task hooks/components, with Phase 05 sprint filtering via URL query |
| Goals and sprints | Phase 05 SWR hooks (`use-goals`, `use-sprints`) |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | root `.env`, deployed | PostgreSQL connection |
| `BETTER_AUTH_SECRET` | `packages/auth-config` + prod | Better Auth signing secret and OAuth state HMAC seed |
| `BETTER_AUTH_URL` | `packages/auth-config` + prod | Better Auth base URL |
| `NEXT_PUBLIC_APP_URL` | `apps/web/.env.local` | Explicit Better Auth client base URL; optional fallback to localhost |
| `GOOGLE_CLIENT_ID` | Hono (api-app) | OAuth client |
| `GOOGLE_CLIENT_SECRET` | Hono (api-app) | OAuth client |
| `GOOGLE_GSC_REDIRECT_URI` | Hono (api-app) | GSC callback URL |
| `GOOGLE_GA4_REDIRECT_URI` | Hono (api-app) | GA4 callback URL |
| `ENCRYPTION_KEY` | Hono (api-app) | Token encryption (32-byte hex) |
| `ENABLE_CRON` | `apps/api/.env` | Enable local cron job execution (default: false) |
| `FRONTEND_URL` | Hono (api-app) | CORS origin for production Vercel URL |
| `FRONTEND_URL_PREVIEW` | Hono (api-app) | CORS origin for Vercel preview deployments |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | API base URL (empty string `/api` in production) |

## Shared Types Package

`packages/types/src/index.ts` exports canonical types used by both API and frontend:

| Type | Description |
|------|-------------|
| `ApiResponse<T>` | Standard API response wrapper |
| `PaginatedResponse<T>` | Paginated list response |
| `Task`, `Project`, `TimeLog` | Core domain models |
| `TaskStatus`, `TaskType`, `TaskPriority` | Task enumerations |

Both `apps/api` and `apps/web` import from this package to ensure type consistency across the monorepo.
