# Env Vars Reference

Single source of truth for all environment variables consumed by this monorepo.

Generate secrets: `openssl rand -hex 32`

## File Locations

| File | Purpose |
|------|---------|
| `.env` | Root — DB URL for Drizzle migrations only |
| `apps/api/.env` | Local dev backend (Hono on port 3001) |
| `apps/web/.env.local` | Production (Hono inside Next.js on Vercel) |

## Variables

| Name | Required | Scope | Example | Description |
|------|----------|-------|---------|-------------|
| `DATABASE_URL` | ✅ | All | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | ✅ | API | 64-char hex | AES-256-GCM key for OAuth token encryption. Generate: `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | ✅ prod | API | 64-char hex | Better Auth signing secret and OAuth state HMAC seed |
| `BETTER_AUTH_URL` | ✅ prod | API | `https://your-app.vercel.app` | Better Auth base URL |
| `GOOGLE_CLIENT_ID` | ✅ | API | `xxx.apps.googleusercontent.com` | Google OAuth 2.0 client ID (shared by GSC + GA4) |
| `GOOGLE_CLIENT_SECRET` | ✅ | API | `GOCSPX-...` | Google OAuth 2.0 client secret |
| `GOOGLE_GSC_REDIRECT_URI` | ⚠️ OAuth | API | `https://app.vercel.app/api/integrations/gsc/callback` | GSC OAuth callback. App warns if missing; GSC auth disabled. |
| `GOOGLE_GA4_REDIRECT_URI` | ⚠️ OAuth | API | `https://app.vercel.app/api/integrations/ga4/callback` | GA4 OAuth callback. App warns if missing; GA4 auth disabled. |
| `NEXT_PUBLIC_APP_URL` | ➖ | Web | `https://your-app.vercel.app` | Better Auth client base URL. Optional; if unset, client falls back to localhost defaults |
| `FRONTEND_URL` | ✅ | API | `https://your-app.vercel.app` | Primary frontend origin — used for CORS and OAuth success redirect |
| `FRONTEND_URL_PREVIEW` | ➖ | API | `https://app-git-branch.vercel.app,https://...` | Comma-separated Vercel preview URLs added to CORS allowlist |
| `CRON_SECRET` | ✅ prod | API | 64-char hex | Shared secret for GitHub Actions → `/api/cron/*` authentication |
| `NEXT_PUBLIC_API_URL` | ➖ | Web | `http://localhost:3001` | API base URL for frontend. Leave empty in production (same-origin) |
| `API_PORT` | ➖ | Local | `3001` | Local dev server port (apps/api only) |
| `NODE_ENV` | ➖ | All | `development` \| `production` | Enables stricter validation and `CRON_SECRET` requirement when `production` |

**Legend:** ✅ Required — app throws on start if missing | ⚠️ Optional but OAuth disabled with warning | ➖ Optional

## Startup Validation

`packages/api-app/src/utils/validate-env.ts` runs at app boot and:
- **Throws** if `DATABASE_URL`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, or `GOOGLE_CLIENT_SECRET` are missing
- **Throws in production** if `CRON_SECRET`, `FRONTEND_URL`, `BETTER_AUTH_SECRET`, or `BETTER_AUTH_URL` are missing
- **Throws** if `ENCRYPTION_KEY` is not exactly 64 hex characters
- **Warns** (does not throw) if `GOOGLE_GSC_REDIRECT_URI` or `GOOGLE_GA4_REDIRECT_URI` are missing
- **Skips** all checks in `NODE_ENV=test`

## Google OAuth Console Setup

Two integration redirect URIs must be registered in the Google Cloud Console:

| Flow | URI Pattern |
|------|------------|
| GSC | `https://<domain>/api/integrations/gsc/callback` |
| GA4 | `https://<domain>/api/integrations/ga4/callback` |

Keep the old Render URIs registered during cutover; remove after 1-week soak.

## Better Auth Notes

- `BETTER_AUTH_URL` should match the deployed app URL so auth links and callbacks resolve correctly
- `NEXT_PUBLIC_APP_URL` is only needed when the Better Auth client should use an explicit base URL
- Internal MVP auth is email/password only. Email verification, password reset, invite email, and Better Auth Google login are intentionally disabled.

## Security Notes

- `.env.example` files contain placeholder values only — safe to commit
- Never commit real secrets; add secret files to `.gitignore`
- `ENCRYPTION_KEY` rotation requires re-encrypting all stored OAuth tokens (out of scope — document separately before rotating)
- `CRON_SECRET` should be `Production` scope only in Vercel dashboard
