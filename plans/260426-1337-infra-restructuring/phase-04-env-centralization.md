# Phase 04 — Env Centralization + OAuth Fixes

**Status:** pending | **Priority:** P1 | **Effort:** 1.5h
**Fixes:** #4, #5, #8, #9, #17

## Context Links
- [Plan overview](./plan.md)
- [Researcher 02: Build & env management](./research/researcher-02-build-env-management.md)
- [Phase 02: Hono in Next.js](./phase-02-hono-into-nextjs.md) (parallel-safe)

## Overview
Fix OAuth redirect URI mismatch (`GOOGLE_REDIRECT_URI` vs `GOOGLE_GSC_REDIRECT_URI`/`GOOGLE_GA4_REDIRECT_URI`). Add startup validation for `ENCRYPTION_KEY`. Split `FRONTEND_URL_PREVIEW` on comma for CORS. Update all `.env.example` files. Centralize env documentation.

## Key Insights
- Code uses `GOOGLE_GSC_REDIRECT_URI` and `GOOGLE_GA4_REDIRECT_URI` (two distinct flows). `render.yaml` documents only `GOOGLE_REDIRECT_URI` (singular) — silent mismatch breaks OAuth.
- `ENCRYPTION_KEY` (used for token encryption) crashes on first OAuth use if missing. Must fail-fast at app startup.
- `FRONTEND_URL_PREVIEW` is currently used as single string in CORS — Vercel preview deploys generate dynamic subdomains, need pattern matching or comma-list.
- Post-Phase-02: API + web same origin → CORS only matters for legacy callers / external testing tools. Simplify but don't remove.
- `.env.example` should be SAFE TO COMMIT — placeholder values only, never real secrets.

## Requirements
- Functional: OAuth GSC + GA4 flows work in production. Token encryption works. CORS allows known origins + preview pattern.
- Non-functional: App fails fast (within 1s of start) on missing critical env vars; clear error message naming the missing var.

## Architecture
```
App startup (apps/web boot OR apps/api dev boot)
  → packages/api-app/src/utils/validate-env.ts
  → throws on missing: ENCRYPTION_KEY, DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  → warns on missing: GOOGLE_GSC_REDIRECT_URI, GOOGLE_GA4_REDIRECT_URI (OAuth disabled flag)
  → continues if NODE_ENV=test (allow tests to mock)

CORS resolver:
  origins = [
    "http://localhost:3002",
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URL_PREVIEW?.split(',') ?? []),
  ].filter(Boolean)
  + dynamic: matches /^https:\/\/.*-{vercel-team}\.vercel\.app$/
```

## Related Code Files
**Create:**
- `packages/api-app/src/utils/validate-env.ts` — startup env validation
- `docs/env-vars-reference.md` — single source of truth for all env vars

**Modify:**
- `packages/api-app/src/app.ts` — call `validateEnv()` at module load
- `packages/api-app/src/index.ts` — CORS config: split `FRONTEND_URL_PREVIEW` on comma
- `apps/api/.env.example` — add `ENCRYPTION_KEY`, replace `GOOGLE_REDIRECT_URI` with `GOOGLE_GSC_REDIRECT_URI` + `GOOGLE_GA4_REDIRECT_URI`, add `CRON_SECRET`, `FRONTEND_URL`, `FRONTEND_URL_PREVIEW`
- `apps/web/.env.local.example` — create if missing; document `NEXT_PUBLIC_API_URL` (empty in prod = same-origin), all server-side vars (since Hono now lives here)
- Root `.env.example` — fix `localhost:3000` → `localhost:3002`; add note that secrets live in app-level files
- `render.yaml` — remove (Phase 05) but DON'T edit here

**Read for context:**
- `apps/api/src/index.ts` lines 25-35 (current CORS)
- `apps/api/src/utils/crypto-tokens.ts` (uses `ENCRYPTION_KEY`)
- `apps/api/src/routes/integrations/gsc.ts` + `ga4.ts` (uses redirect URIs)

## Implementation Steps
1. **Create env validator** (`utils/validate-env.ts`):
   ```ts
   const REQUIRED = ['DATABASE_URL', 'ENCRYPTION_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const
   const REQUIRED_OAUTH = ['GOOGLE_GSC_REDIRECT_URI', 'GOOGLE_GA4_REDIRECT_URI'] as const
   const REQUIRED_PROD = ['CRON_SECRET'] as const

   export function validateEnv() {
     if (process.env.NODE_ENV === 'test') return
     const missing: string[] = []
     for (const k of REQUIRED) if (!process.env[k]) missing.push(k)
     if (process.env.NODE_ENV === 'production') {
       for (const k of REQUIRED_PROD) if (!process.env[k]) missing.push(k)
     }
     if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`)
     // Validate ENCRYPTION_KEY is exactly 32 bytes hex (64 chars)
     if (process.env.ENCRYPTION_KEY!.length !== 64) {
       throw new Error('ENCRYPTION_KEY must be 64-char hex (32 bytes)')
     }
     for (const k of REQUIRED_OAUTH) {
       if (!process.env[k]) console.warn(`[env] OAuth disabled: ${k} not set`)
     }
   }
   ```
2. **Call at app load** in `packages/api-app/src/app.ts` (top of file, before route registration).
3. **Fix CORS** in `app.ts`:
   ```ts
   const previewOrigins = (process.env.FRONTEND_URL_PREVIEW ?? '').split(',').map(s => s.trim()).filter(Boolean)
   const origins = ['http://localhost:3002', process.env.FRONTEND_URL, ...previewOrigins].filter(Boolean) as string[]
   ```
   - Remove `localhost:3000` (no longer used)
   - Optionally add regex matcher for `*.vercel.app` preview deploys via custom origin function.
4. **Update `apps/api/.env.example`**:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/seo_impact_os
   ENCRYPTION_KEY=  # 64-char hex; generate: openssl rand -hex 32
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_GSC_REDIRECT_URI=http://localhost:3002/api/integrations/gsc/callback
   GOOGLE_GA4_REDIRECT_URI=http://localhost:3002/api/integrations/ga4/callback
   FRONTEND_URL=http://localhost:3002
   FRONTEND_URL_PREVIEW=  # comma-separated for Vercel previews
   CRON_SECRET=  # generate: openssl rand -hex 32 (production only)
   API_PORT=3001  # local dev only
   NODE_ENV=development
   ```
5. **Create `apps/web/.env.local.example`** mirroring above (since Hono now lives in web app):
   ```
   # Same as apps/api/.env.example since Hono runs inside Next.js
   # NEXT_PUBLIC_API_URL: leave empty in production (same-origin)
   NEXT_PUBLIC_API_URL=
   # ... (all backend vars)
   ```
6. **Update root `.env.example`**: keep only `DATABASE_URL` as documentation pointer; note "secrets live in app-level .env files".
7. **Update Vercel dashboard env vars** (manual):
   - Add: `ENCRYPTION_KEY`, `GOOGLE_GSC_REDIRECT_URI`, `GOOGLE_GA4_REDIRECT_URI`, `CRON_SECRET`, `FRONTEND_URL`, `FRONTEND_URL_PREVIEW`, all existing.
   - Set scopes: `Production` for sensitive; `Production + Preview` for `NEXT_PUBLIC_*`.
8. **Update Google OAuth Console** (manual, BEFORE Vercel cutover):
   - Add new authorized redirect URIs:
     - `https://task-management.vercel.app/api/integrations/gsc/callback`
     - `https://task-management.vercel.app/api/integrations/ga4/callback`
   - Keep old Render URIs during transition; remove after 1 week soak.
9. **Create `docs/env-vars-reference.md`**: table of all vars (name, scope, required, example, description).
10. **Verify startup**: run `npm run dev` with one var missing → app should crash fast with clear message.

## Todo List
- [x] Create `validate-env.ts` with required + optional checks
- [x] Wire `validateEnv()` into `app.ts` boot
- [x] Fix CORS comma split for `FRONTEND_URL_PREVIEW`
- [x] Update `apps/api/.env.example`
- [x] Create `apps/web/.env.local.example`
- [x] Slim root `.env.example`
- [ ] Add new env vars to Vercel dashboard (MANUAL — out of code scope)
- [ ] Add new redirect URIs to Google OAuth Console (MANUAL — out of code scope)
- [x] Create `docs/env-vars-reference.md`
- [x] Test: missing var → fast fail
- [x] Test: invalid `ENCRYPTION_KEY` length → fast fail

## Success Criteria
- App refuses to start (clear error) if `ENCRYPTION_KEY` missing or wrong length
- CORS allows multiple comma-separated preview URLs
- OAuth GSC + GA4 flows complete on Vercel preview deploy (test with real Google account)
- `docs/env-vars-reference.md` lists every env var consumed by code
- No env var named `GOOGLE_REDIRECT_URI` (singular) referenced anywhere

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Strict validation crashes existing local dev environments | H | M | Communicate change in PR description; add migration note in env reference |
| Forgetting to add `CRON_SECRET` to Vercel before Phase 03 deploy | M | H | Validation gates production startup; surfaces immediately |
| Google OAuth Console URI not updated before traffic flips | H | H | Manual checklist step 8; coordinate with Phase 02 cutover |
| `ENCRYPTION_KEY` differs between Render and Vercel → existing tokens un-decryptable | H | H | Copy exact value from Render dashboard; verify before deleting Render |
| Preview deploys break (CORS) for external testers | L | L | Same-origin in production; preview testers use direct route |

## Security Considerations
- Never commit real env values; `.env.example` placeholders only
- `ENCRYPTION_KEY` rotation requires re-encrypting all tokens — out of scope, document for follow-up
- `CRON_SECRET` in Production scope only (preview/dev should not have it; cron doesn't run there)
- Validate `ENCRYPTION_KEY` format (hex 64 chars) — reject weak values
- Document key generation: `openssl rand -hex 32`

## Next Steps
- **Parallel-safe with:** Phase 01
- **Blocks:** Phase 02 production deploy (OAuth requires correct redirect URIs in Vercel + Google Console)
- **Follow-up:** ENCRYPTION_KEY rotation procedure; secrets manager (e.g., Doppler) if team grows
