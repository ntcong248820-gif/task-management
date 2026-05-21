---
name: Codebase Review — Bugs & Security Issues
type: report
date: 2026-04-21
---

# Codebase Review Report

**Project:** SEO Impact OS  
**Date:** 2026-04-21  
**Reviewer:** automated scan + manual analysis  
**Scope:** Security, hardcoded values, OAuth bugs, error handling, code quality

---

## 🔴 HIGH — Security

### S1: OAuth tokens stored in plaintext
- **File:** `packages/db/src/schema/integrations.ts:14-15`
- `accessToken: text('access_token').notNull()` and `refreshToken: text('refresh_token').notNull()` — no encryption
- Anyone with DB read access can steal and use tokens
- **Fix:** AES-256-GCM encrypt before INSERT, decrypt after SELECT using `ENCRYPTION_KEY`

### S2: `/debug/db` endpoint exposed in production
- **File:** `apps/api/src/index.ts:46-95`
- Exposes `DATABASE_URL` preview + raw SQL results in JSON
- A GET request to `/debug/db` works in production
- **Fix:** Remove entirely or gate behind `NODE_ENV !== 'production'`

### S3: No rate limiting on any endpoint
- **File:** `apps/api/src/index.ts` — no rate limit middleware
- All routes (`/api/sync`, `/api/integrations/*`) can be hammered freely
- **Fix:** Add `@hono/rate-limiter` or simple in-memory limiter to sensitive routes

---

## 🟠 MEDIUM — OAuth Flow Bugs

### O1: `token-refresh.ts` uses wrong redirect URI
- **File:** `apps/api/src/utils/token-refresh.ts:32`
- `refreshOAuthTokens()` passes `process.env.GOOGLE_REDIRECT_URI` (generic) to `google.auth.OAuth2`
- GA4 tokens will fail refresh if `GOOGLE_REDIRECT_URI` differs from `GA4_REDIRECT_URI`
- **Fix:** Pass redirect URI as param or use `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` only (not needed for refresh)

### O2: `GA4Client` and `GSCClient` constructors use wrong redirect URI
- **File:** `apps/api/src/routes/integrations/ga4.ts:16`, `gsc.ts:16`
- Both use `process.env.GOOGLE_REDIRECT_URI!` — the generic fallback
- Correct env vars (`GSC_REDIRECT_URI`, `GA4_REDIRECT_URI`) are only used in `getOAuthConfig()`, not in client constructors
- **Fix:** Use `getOAuthConfig().redirectUri` in constructors, or pass it as a param

### O3: Integration status returns `createdAt` as `lastSync`
- **File:** `apps/api/src/routes/integrations/index.ts:38-40`
- `lastSync: integrations.gsc.createdAt` — shows when token was created, not last sync time
- Frontend shows stale/wrong "Last synced" date
- **Fix:** Add `lastSyncedAt` column to `oauth_tokens` table, update on each sync

### O4: No UI feedback on OAuth success
- **File:** `apps/web/src/app/dashboard/integrations/page.tsx:57-60`
- OAuth callback success/error only logged to `console.log` — no toast shown to user
- **Fix:** Add toast notification using shadcn/ui `toast` on success/error from URL params

---

## 🟠 MEDIUM — Hardcoded Values

### H1: Vercel URL hardcoded in CORS config
- **File:** `apps/api/src/index.ts:28`
- `'https://task-management-app-theta-two.vercel.app'` hardcoded
- Breaks if domain changes; no fallback if `FRONTEND_URL` env is set
- **Fix:** Use only `process.env.FRONTEND_URL` + localhost; remove hardcoded domain

### H2: Default `projectId = 1` in 5 hooks
- **Files:**
  - `apps/web/src/hooks/useAnalyticsData.ts:64`
  - `apps/web/src/hooks/useURLsData.ts:91`
  - `apps/web/src/hooks/useDiagnosisData.ts:33`
  - `apps/web/src/hooks/useRankingsData.ts:92`
  - `apps/web/src/hooks/useKeywordDetailData.ts:30`
- Default `projectId = 1` — project ID 1 may not exist in production
- **Fix:** Remove default; require projectId as mandatory param; pages should pass from `selectedProjectId` store/localStorage

### H3: `API_BASE` duplicated in `dashboard/page.tsx`
- **File:** `apps/web/src/app/dashboard/page.tsx:12`
- `const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` — duplicates `src/lib/config.ts`
- **Fix:** Replace with `import { getApiUrl } from '@/lib/config'`

---

## 🟡 LOW — Error Handling & Validation

### E1: `correlation.ts` silently defaults `projectId` to 1
- **File:** `apps/api/src/routes/correlation.ts:26`
- `const projectId = Number(c.req.query('projectId') || 1)` — returns project 1 data if param missing
- **Fix:** Return 400 if `projectId` is missing/invalid (same pattern as `analytics.ts`)

### E2: No Zod validation on sync endpoints
- **Files:** `gsc.ts /sync`, `ga4.ts /sync`
- `days` param accepted without validation — could be negative, `NaN`, or `999999`
- **Fix:** Parse and clamp `days` to a valid range (e.g. 1–365)

### E3: Deprecated frontend callback route never cleaned up
- **File:** `apps/web/src/app/api/auth/callback/google/route.ts`
- File comments say "This route is deprecated" but it remains with `console.log` leaks
- **Fix:** Delete file; confirm Google Cloud Console doesn't use this redirect URI

---

## 🟡 LOW — Code Quality

### Q1: 296 `console.log/error/warn` calls in API — logger exists but unused
- **Files:** All `apps/api/src/routes/integrations/gsc.ts`, `ga4.ts`, `jobs/`, etc.
- A `logger` utility exists at `apps/api/src/utils/logger.ts` but route files bypass it
- **Fix:** Replace `console.*` with `logger.*` calls across route files

### Q2: Extensive `any` types in Google API clients
- **Files:** `ga4.ts:9-10`, `gsc.ts` — `private oauth2Client: any`, `private analyticsdata: any`
- **Fix:** Import proper types from `googleapis` package

### Q3: `.js` build artifacts committed to repo
- **Files:** `packages/db/src/schema/*.js` (8 files: `ga4_data.js`, `gsc_data.js`, `integrations.js`, etc.)
- Build artifacts shouldn't be versioned alongside source
- **Fix:** Add `packages/db/src/**/*.js` to `.gitignore`, delete existing files

### Q4: `jobs/index.ts` mixes ES imports and `require()`
- **File:** `apps/api/src/jobs/index.ts:13-14`
- `startAllSyncJobs` uses `require('./sync-gsc')` inside function body — CJS in ESM context
- **Fix:** Remove redundant `require()` calls; use already-imported named exports at top

### Q5: Cron jobs only start in `NODE_ENV === 'production'`
- **File:** `apps/api/src/index.ts:162`
- No way to test cron jobs locally
- **Fix:** Add `ENABLE_CRON=true` env flag to allow local testing

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 HIGH  | 3 |
| 🟠 MEDIUM | 7 |
| 🟡 LOW   | 5 |
| **Total** | **15** |

**Top priority fixes (in order):**
1. S1 — Encrypt OAuth tokens at rest
2. S2 — Remove `/debug/db` endpoint
3. H1 — Remove hardcoded Vercel URL from CORS
4. O1/O2 — Fix redirect URI in token refresh + client constructors
5. H2 — Remove hardcoded `projectId = 1` defaults

---

## Unresolved Questions

1. Is `apps/web/src/app/api/auth/callback/google/route.ts` registered as a redirect URI in Google Cloud Console? Must confirm before deleting.
2. Is `ENCRYPTION_KEY` already set in Render production env? (Referenced in `.env.production.example` but encryption not implemented yet)
3. Should `lastSyncedAt` be per-project-per-provider, or per individual sync run?
