# System Architecture

## Overview

Monorepo (Turborepo) with two apps and two shared packages.

```
task-management/
├── apps/
│   ├── api/        → Hono backend  (port 3001)
│   └── web/        → Next.js 15    (port 3002)
├── packages/
│   ├── db/         → Drizzle ORM schema + DB client
│   └── types/      → Shared TypeScript types
├── plans/          → Implementation plans & agent reports
├── docs/           → Project documentation
└── scripts/        → Utility scripts (sync, encode, etc.)
```

## Service Architecture

```
Browser
  │
  ▼
Next.js (Vercel)          ← NEXT_PUBLIC_API_URL
  │  App Router
  │  RSC + Client Components
  │  Zustand stores
  │
  ▼ REST API calls
Hono API (Render)          ← DATABASE_URL, GOOGLE_*, ENCRYPTION_KEY
  │  /api/projects
  │  /api/tasks
  │  /api/time-logs
  │  /api/analytics
  │  /api/correlation
  │  /api/rankings
  │  /api/urls
  │  /api/keywords/:kw
  │  /api/diagnosis/:kw
  │  /api/integrations/gsc/*
  │  /api/integrations/ga4/*
  │  node-cron (2:00 AM GSC, 2:30 AM GA4)
  │
  ▼ Drizzle ORM
PostgreSQL (hosted)
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `projects` | Multi-project support |
| `tasks` | SEO tasks with status, dates |
| `time_logs` | Time tracking entries per task |
| `oauth_tokens` | Encrypted GSC + GA4 tokens with `lastSyncedAt` tracking (nullable; falls back to `createdAt` until first sync) |
| `gsc_sites` | GSC site/property URLs and permission levels |
| `ga4_properties` | GA4 property IDs and names |
| `gsc_data` | Raw GSC rows (site, query, date, metrics) |
| `gsc_data_aggregated` | Daily aggregated GSC metrics |
| `ga4_data` | GA4 sessions, users, conversions |

## Google OAuth Flows

Two separate OAuth callbacks with distinct redirect URIs:

```
GSC OAuth:
  /api/integrations/gsc/auth  →  Google  →  /api/integrations/gsc/callback

GA4 OAuth:
  /api/integrations/ga4/auth  →  Google  →  /api/integrations/ga4/callback
```

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
| `DATABASE_URL` | api + root | PostgreSQL connection |
| `GOOGLE_CLIENT_ID` | api | OAuth client |
| `GOOGLE_CLIENT_SECRET` | api | OAuth client |
| `GOOGLE_GSC_REDIRECT_URI` | api | GSC callback URL |
| `GOOGLE_GA4_REDIRECT_URI` | api | GA4 callback URL |
| `ENCRYPTION_KEY` | api | Token encryption (32-byte hex) |
| `FRONTEND_URL` | api | CORS origin for production Vercel URL |
| `FRONTEND_URL_PREVIEW` | api | CORS origin for Vercel preview deployments |
| `NEXT_PUBLIC_API_URL` | web | API base URL |
