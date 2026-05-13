# Deployment Guide

## Production Stack

| Service | Platform | URL |
|---------|----------|-----|
| Frontend + API (Next.js + Hono) | Vercel | `https://task-management-web-zeta.vercel.app` |
| Database | Supabase PostgreSQL (Pooler) | Port 6543 (session pooler, aws-1-ap-southeast-1) |

Both frontend and API run on the same Vercel deployment — Hono is mounted inside Next.js via `[[...route]]` catch-all route at `/api`.

Phase 01 adds Better Auth on the same deployment:
- Auth handler: `/api/auth/[...all]`
- Login/signup/workspace pages: `/login`, `/signup`, `/workspace`
- Dashboard routes still use same-origin cookies and the shared session from Better Auth

## Environment Variables (Vercel)

Set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

| Name | Value | Scope |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.[hash]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres` | Production |
| `ENCRYPTION_KEY` | 64-char hex from `openssl rand -hex 32` | Production |
| `BETTER_AUTH_SECRET` | 32-byte secret from `openssl rand -hex 32` | Production |
| `BETTER_AUTH_URL` | `https://task-management-web-zeta.vercel.app` | Production |
| `RESEND_API_KEY` | Resend API key | Production |
| `RESEND_FROM_EMAIL` | `SEO Impact OS <onboarding@resend.dev>` or verified sender | Optional |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Production |
| `GOOGLE_CLIENT_SECRET` | `xxx` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://task-management-web-zeta.vercel.app` or leave unset | Optional client base URL |
| `GOOGLE_GSC_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback` | Production |
| `GOOGLE_GA4_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback` | Production |
| `CRON_SECRET` | 64-char hex from `openssl rand -hex 32` | Production |
| `FRONTEND_URL` | `https://task-management-web-zeta.vercel.app` | Production |
| `FRONTEND_URL_PREVIEW` | Comma-separated preview URLs (optional) | Production |
| `NEXT_PUBLIC_API_URL` | Leave empty (same-origin in production) | Production + Preview |

## Google OAuth — CRITICAL

In **Google Cloud Console** → OAuth credentials → **Authorized redirect URIs**, add:

```
https://task-management-web-zeta.vercel.app/api/auth/callback/google
https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback
https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback
```

Auth, GSC, and GA4 use **separate** redirect URIs. Missing any of them breaks that flow.

## Deploy Steps

### 0. Prerequisites

- Supabase project created (project ID required for DB URL)
- New project? `last_synced_at` column in `oauth_tokens` table may need manual creation — see Troubleshooting
- Resend sender configured if `RESEND_FROM_EMAIL` is not using the default dev sender

### 1. Database

```bash
# Push schema to production DB
DATABASE_URL=<prod-url> npm run db:push
```

**Note:** Session pooler uses port 6543; direct connection uses port 5432. For production Vercel, always use 6543.

### 2. Vercel

1. Connect GitHub repo to Vercel (new project)
2. Set root directory: `apps/web`
3. Set build command: `npm run build`
4. Add all env vars from the table above
5. Auto-deploys on push to `main`

### 3. GitHub Actions — Cron

In **GitHub repo settings** → **Secrets and variables**:

**Secrets:**
- `CRON_SECRET` — same value as Vercel `CRON_SECRET` (64-char hex from `openssl rand -hex 32`)

**Variables:**
- `APP_URL` — `task-management-web-zeta.vercel.app` (without https://)

Workflow file: `.github/workflows/cron-sync.yml`

**Trigger times (UTC):**
- GSC sync: 7:00 PM UTC daily
- GA4 sync: ~7:05 PM UTC daily (runs after GSC to avoid concurrent DB writes)

**Note:** Cron jobs trigger Vercel serverless functions via HTTP Bearer auth. Verify both GSC and GA4 endpoints return 200 after first deployment.

## CORS

Origins are controlled by `FRONTEND_URL` and `FRONTEND_URL_PREVIEW` (comma-separated) in the CORS middleware. Both must match the exact Vercel domain.

## Local Development

```bash
npm run dev          # Starts: API :3001 (optional), Web :3002
```

For local cron simulation: set `ENABLE_CRON=true` in `apps/api/.env`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth callback fails | Verify redirect URI in Google Cloud Console matches env vars exactly |
| DB connection error (pooler) | Check `DATABASE_URL` pooler port is **6543**; test with `psql DATABASE_URL` |
| DB connection error (direct) | If using direct connection (not pooler), port is 5432 |
| `last_synced_at` column missing | New Drizzle migrations may not create the column. Add manually: `ALTER TABLE oauth_tokens ADD COLUMN last_synced_at TIMESTAMP;` |
| Cron not firing | Check GitHub Actions workflow runs; verify both `CRON_SECRET` (Secret) and `APP_URL` (Variable) are set in GitHub |
| Cron returns 401 | Verify `CRON_SECRET` in GitHub matches Vercel env var exactly |
| 404 on cron endpoints | Ensure Vercel deployment is active (not paused) and latest code is deployed |
| API URL config incorrect | Development: set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `apps/web/.env.local`. Production: leave empty (same-origin) |
| Vercel cold start | Serverless functions spin up on first request after idle; no fix for free tier |
