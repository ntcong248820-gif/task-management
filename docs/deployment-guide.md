# Deployment Guide

## Production Stack

| Service | Platform | URL |
|---------|----------|-----|
| Frontend + API (Next.js + Hono) | Vercel | `https://task-management-web-zeta.vercel.app` |
| Database | Supabase (PostgreSQL, port 5432) | Pooler connection |

Both frontend and API run on the same Vercel deployment — Hono is mounted inside Next.js via `[[...route]]` catch-all route at `/api`.

## Environment Variables (Vercel)

Set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

| Name | Value | Scope |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.[hash]:[pass]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` | Production |
| `ENCRYPTION_KEY` | 64-char hex from `openssl rand -hex 32` | Production |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Production |
| `GOOGLE_CLIENT_SECRET` | `xxx` | Production |
| `GOOGLE_GSC_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback` | Production |
| `GOOGLE_GA4_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback` | Production |
| `CRON_SECRET` | 64-char hex from `openssl rand -hex 32` | Production |
| `FRONTEND_URL` | `https://task-management-web-zeta.vercel.app` | Production |
| `FRONTEND_URL_PREVIEW` | Comma-separated preview URLs (optional) | Production |
| `NEXT_PUBLIC_API_URL` | Leave empty (same-origin in production) | Production + Preview |

## Google OAuth — CRITICAL

In **Google Cloud Console** → OAuth credentials → **Authorized redirect URIs**, add:

```
https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback
https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback
```

GSC and GA4 use **separate** redirect URIs. Missing either breaks OAuth.

## Deploy Steps

### 1. Database

```bash
# Push schema to production DB
DATABASE_URL=<prod-url> npm run db:push
```

### 2. Vercel

1. Connect GitHub repo to Vercel (new project)
2. Set root directory: `apps/web`
3. Set build command: `npm run build`
4. Add all env vars from the table above
5. Auto-deploys on push to `main`

### 3. GitHub Actions — Cron

Add to **GitHub repo secrets**:
- `CRON_SECRET` — same value as Vercel `CRON_SECRET`

Workflow file: `.github/workflows/cron-sync.yml`

**Trigger times (UTC):**
- GSC sync: 7:00 PM UTC daily
- GA4 sync: ~7:05 PM UTC daily

**Note:** Cron jobs trigger Vercel serverless functions via HTTP Bearer auth — Vercel must be awake (free tier sleeps after 7 days inactivity). For high-traffic periods this works; for long idle periods consider upgrading to keep warm.

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
| DB connection error | Check `DATABASE_URL` pooler port is 5432; test with `psql` |
| Cron not firing | Check GitHub Actions workflow runs; verify `CRON_SECRET` matches in both GitHub secrets and Vercel env |
| 404 on cron endpoints | Ensure Vercel deployment is active (not paused) |
| Vercel cold start | Serverless functions spin up on first request after idle; no fix for free tier |