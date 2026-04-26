# System Architecture

## Overview

Monorepo (Turborepo) with two apps and multiple shared packages.

```
task-management/
├── apps/
│   ├── api/        → Local development server (port 3001, optional)
│   └── web/        → Next.js 15 + Hono App Router (port 3002, Vercel)
├── packages/
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
  │  └─ Hono API mounted at /api (via [[...route]]/route.ts)
  │     ├─ /api/projects
  │     ├─ /api/tasks, /api/time-logs
  │     ├─ /api/analytics, /api/correlation
  │     ├─ /api/integrations/gsc/*, /api/integrations/ga4/*
  │     └─ Sync jobs (2:00 AM GSC, 2:30 AM GA4 — Vercel cron)
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

**Key Change (Phase 02):** Web + API now collocated on same Vercel deployment. The Hono app is exported from `packages/api-app` and mounted via Next.js route handler at `/api`. Separate backend at port 3001 is for local development only.

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `projects` | Multi-project support |
| `tasks` | SEO tasks with status, dates. Status enum: `'todo' \| 'in_progress' \| 'done'`. Task type enum: `'technical' \| 'content' \| 'links'` (nullable). Priority enum: `'low' \| 'medium' \| 'high'`. **Check constraints enforce valid values at DB level.** |
| `time_logs` | Time tracking entries per task |
| `oauth_tokens` | Encrypted GSC + GA4 tokens with `lastSyncedAt` tracking (nullable; falls back to `createdAt` until first sync) |
| `gsc_sites` | GSC site/property URLs and permission levels |
| `ga4_properties` | GA4 property IDs and names |
| `gsc_data` | Raw GSC rows (site, query, date, metrics) |
| `gsc_data_aggregated` | Daily aggregated GSC metrics |
| `ga4_data` | GA4 sessions, users, conversions. Indexed on `(projectId, date)` for efficient date-range queries. |

## Google OAuth Flows

Two separate OAuth callbacks with distinct redirect URIs, both handled by the Hono app in `packages/api-app`:

```
GSC OAuth:
  /api/integrations/gsc/auth  →  Google  →  /api/integrations/gsc/callback

GA4 OAuth:
  /api/integrations/ga4/auth  →  Google  →  /api/integrations/ga4/callback
```

In production (Vercel), these routes are served by the Hono app mounted at `/api` within the Next.js app. OAuth callbacks are no longer Next.js route handlers (`apps/web/src/app/api/auth/callback/*/route.ts` deleted).

**Token Storage & Encryption:**
- Tokens encrypted with AES-256-GCM before DB storage
- Uses `ENCRYPTION_KEY` env var (32-byte, stored as 64-char hex)
- Format: `{iv:tag:ciphertext}` (hex-encoded)
- Backward-compatible with unencrypted legacy tokens
- Token refresh only includes `access_token` and `refresh_token` — redirect URI not required for refresh
- See `src/utils/crypto-tokens.ts` for encryption/decryption and `src/utils/token-refresh.ts` for refresh logic

**Rate Limiting:**
- `/sync` endpoints — 5 requests per minute per IP
- `/authorize` endpoints — 10 requests per minute per IP
- Protects against abuse during OAuth flows and manual sync triggers

## Data Sync (Cron Jobs)

| Job | Schedule | File |
|-----|----------|------|
| GSC sync | 2:00 AM daily | `apps/api/src/jobs/sync-gsc.ts` |
| GA4 sync | 2:30 AM daily | `apps/api/src/jobs/sync-ga4.ts` |

Manual sync also available via `POST /api/integrations/gsc/sync` and `POST /api/integrations/ga4/sync`. Both routes update `lastSyncedAt` on success and support optional `days` parameter (1–365, clamped automatically). Status endpoint returns `lastSyncedAt` (or `createdAt` if never synced).

## Correlation Logic

- Each task has an `impact_window` (7–28 days)
- Correlation chart shades the window after task completion
- Backend computes overlap between task windows and metric changes
- Client renders multi-layer Recharts (GSC traffic + GA4 + task markers)

## Frontend State Management

| State | Store |
|-------|-------|
| Active timer | Zustand (`timer-store`) |
| Selected project | Zustand (`project-store`) |
| Kanban tasks | Server state via fetch + local optimistic updates |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | root `.env`, deployed | PostgreSQL connection |
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
