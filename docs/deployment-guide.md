# Deployment Guide

## Production Stack

| Service | Platform | URL |
|---------|----------|-----|
| Frontend (Next.js) | Vercel | Auto-deploy on `git push main` |
| Backend API (Hono) | Render | Manual or auto-deploy |
| Database (PostgreSQL) | Render/Supabase | Persistent |

## Environment Variables

### apps/api (Render)

```env
DATABASE_URL=postgresql://...
API_PORT=3001
NODE_ENV=production
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_GSC_REDIRECT_URI=https://<api-domain>/api/integrations/gsc/callback
GOOGLE_GA4_REDIRECT_URI=https://<api-domain>/api/integrations/ga4/callback
ENCRYPTION_KEY=<64-char hex>   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# CORS origins - Vercel production + preview deployments
FRONTEND_URL=https://<vercel-domain>.vercel.app
FRONTEND_URL_PREVIEW=           # Optional: preview deployment URL
```

### apps/web (Vercel)

```env
NEXT_PUBLIC_API_URL=https://<api-domain>
```

## Deploy Steps

### 1. Database

```bash
# Push schema to production DB
DATABASE_URL=<prod-url> npm run db:push
```

**CRITICAL:** After Phase 2 OAuth updates, `npm run db:push` **must be run** to add the `lastSyncedAt` column to the `oauth_tokens` table. This column tracks when integrations were last synced and is used by the status endpoint.

### 2. Backend (Render)

1. Connect GitHub repo to Render
2. Set build command: `npm run build --filter=api`
3. Set start command: `node apps/api/dist/index.js`
4. Add all env vars from above

### 3. Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set root directory: `apps/web`
3. Add `NEXT_PUBLIC_API_URL` pointing to Render URL
4. Auto-deploys on push to `main`

### 4. Google OAuth — CRITICAL

In Google Cloud Console → OAuth credentials → Authorized redirect URIs, add **both**:
- `https://<api-domain>/api/integrations/gsc/callback`
- `https://<api-domain>/api/integrations/ga4/callback`

GSC and GA4 use **separate** redirect URIs. Missing either breaks OAuth.

### 5. CORS

In `apps/api/src/index.ts`, `FRONTEND_URL` and `FRONTEND_URL_PREVIEW` env vars control CORS origins. Both must match the exact Vercel domain (no trailing slash).

## Cron Jobs (Production)

Cron jobs are triggered by GitHub Actions (`.github/workflows/cron-sync.yml`):
- GSC sync: 7:00 PM UTC (19:00) daily
- GA4 sync: ~7:05 PM UTC daily (runs after GSC, even if GSC fails)

**Setup:**
1. Add `CRON_SECRET` to GitHub repository secrets (same value used in API env vars)
2. Add `APP_URL` to GitHub repository secrets (e.g., `https://api.example.com`)
3. GitHub Actions handles scheduling — no need for Render cron configuration

**Note:** Local development can still use `ENABLE_CRON=true` in `apps/api/.env` to run jobs in-process without GitHub Actions.

## Manual Sync

```bash
# Trigger sync via API
curl -X POST https://<api-domain>/api/integrations/gsc/sync
curl -X POST https://<api-domain>/api/integrations/ga4/sync
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Check `FRONTEND_URL` (and `FRONTEND_URL_PREVIEW` if using previews) match Vercel URL exactly |
| OAuth callback fails | Verify redirect URI in Google Cloud Console matches env var |
| DB connection error | Check `DATABASE_URL`, test with `psql <url>` |
| Cron not running | Check Render logs; ensure service is not sleeping |
| Token "Tenant not found" | Supabase pooler issue — use direct connection port 5432 |
