# Environment Variables Setup Guide

## Production URLs

| Service | URL |
|---------|-----|
| **Frontend + API** | https://task-management-web-zeta.vercel.app |
| **Database** | Supabase (Session Mode Pooler on port 5432) |

---

## Vercel Environment Variables

Set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

| Name | Value | Scope |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.jtdeuxvwcwtqzjndhrlg:...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` | Production |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (generate new) | Production |
| `GOOGLE_CLIENT_ID` | *(set in Vercel — see Google Cloud Console)* | Production |
| `GOOGLE_CLIENT_SECRET` | *(set in Vercel — see Google Cloud Console)* | Production |
| `GOOGLE_GSC_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback` | Production |
| `GOOGLE_GA4_REDIRECT_URI` | `https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback` | Production |
| `CRON_SECRET` | `openssl rand -hex 32` (generate new) | Production |
| `FRONTEND_URL` | `https://task-management-web-zeta.vercel.app` | Production |
| `FRONTEND_URL_PREVIEW` | *(comma-separated preview URLs, optional)* | Production |
| `NEXT_PUBLIC_API_URL` | *(leave empty = same-origin)* | Production + Preview |

---

## Google Cloud Console Setup

Add to **Authorized redirect URIs** in Google Cloud Console:

```
https://task-management-web-zeta.vercel.app/api/integrations/gsc/callback
https://task-management-web-zeta.vercel.app/api/integrations/ga4/callback
```

---

## Generate Secrets

```bash
# ENCRYPTION_KEY and CRON_SECRET
openssl rand -hex 32
```

---

## Local Development

Create `.env` in project root:

```bash
DATABASE_URL=postgresql://postgres.jtdeuxvwcwtqzjndhrlg:...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_GSC_REDIRECT_URI=http://localhost:3002/api/integrations/gsc/callback
GOOGLE_GA4_REDIRECT_URI=http://localhost:3002/api/integrations/ga4/callback
FRONTEND_URL=http://localhost:3002
CRON_SECRET=<generate-with-openssl-rand-hex-32>
API_PORT=3001
NODE_ENV=development
```

---

## Key Changes (2026-04)

- Frontend + API now on same Vercel project (no more Render backend)
- `GOOGLE_REDIRECT_URI` (singular) replaced with:
  - `GOOGLE_GSC_REDIRECT_URI`
  - `GOOGLE_GA4_REDIRECT_URI`
- `NEXT_PUBLIC_API_URL` leave empty in production (same-origin)
- `ENCRYPTION_KEY` and `CRON_SECRET` are new — generate fresh
