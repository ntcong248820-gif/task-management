# Phase 02 — Hono into Next.js Route Handlers

**Status:** complete | **Priority:** P1 | **Effort:** 3h
**Fixes:** #3, #7, #14, #18, #19

## Context Links
- [Plan overview](./plan.md)
- [Phase 01: Vercel/Turborepo config](./phase-01-vercel-monorepo-config.md) (blocker)
- [Researcher 01: Vercel/Hono migration](./research/researcher-01-vercel-hono-migration.md)

## Overview
Mount existing Hono app at `apps/web/src/app/api/[[...route]]/route.ts` via `hono/vercel` adapter. Eliminate standalone API server (Render). Move existing Next.js auth callback INTO Hono. Keep `apps/api/` as **dev-only local server** initially.

## Key Insights
- `hono/vercel` exports `handle()` that wraps Hono → returns Next.js Route Handler signature.
- Catch-all `[[...route]]` (double-bracket) matches root + nested paths; required because `auth/callback/google/route.ts` exists at deeper level — **collision risk**: catch-all loses precedence to specific route only when specific route file exists; specific routes ALWAYS win in Next.js. Solution: move `auth/callback/google/route.ts` content into Hono and DELETE the file to avoid two sources of truth.
- No `basePath('/api')` needed if Hono mount is at `app/api/[[...route]]/`. Existing routes are registered as `/api/projects` etc. — must remove `/api` prefix OR keep basePath. **Decision:** keep `basePath('/api')` for minimal route changes.
- All Hono routes work unchanged. Middleware (cors, logger, rateLimiter) works.
- `prettyJSON` and `logger` middleware: `logger` may spam Vercel logs — keep but log-level scope.
- `serve()` from `@hono/node-server` is removed — Vercel runtime handles HTTP.
- Rate limiter `hono-rate-limiter` uses in-memory store by default — **breaks on serverless** (each invocation = cold instance). Need Redis/Upstash or accept per-instance limits as best-effort.

## Requirements
- Functional: All existing `/api/*` endpoints accessible from `https://{domain}/api/*`. Auth callback works. Google OAuth flows complete end-to-end.
- Non-functional: p95 cold start <800ms; warm response <200ms.

## Architecture
```
Browser → https://task-management.vercel.app/api/projects
  → Next.js routes catch-all
  → apps/web/src/app/api/[[...route]]/route.ts
  → handle(honoApp)  [from hono/vercel]
  → Hono with basePath('/api')
  → projectsRoutes / tasksRoutes / etc.
  → @repo/db (Drizzle) → Postgres
```

Same-origin: web + API on same Vercel domain → no CORS preflight in production. Preview deploys also same-origin.

## Related Code Files
**Create:**
- `apps/web/src/app/api/[[...route]]/route.ts` — Hono mount

**Modify:**
- `apps/web/package.json` — add `hono`, `@hono/zod-validator`, `googleapis`, `hono-rate-limiter`, `@google-analytics/data`, `node-cache`, `zod`, `@repo/integrations`, `@repo/db`, `@repo/types` (already present)
- `apps/web/next.config.js` — REMOVE `rewrites()` block (no longer proxying)
- `apps/web/tsconfig.json` — verify path aliases for `@repo/*` work in route handlers
- `apps/api/package.json` — mark scripts `dev` only; add note in README
- `apps/api/src/index.ts` — remove `startAllSyncJobs()` call (Phase 03 handles)

**Delete (after smoke test):**
- `apps/web/src/app/api/auth/callback/google/route.ts` (logic absorbed into Hono `gscRoutes` / `ga4Routes`)
- `apps/web/src/app/api/analytics/` empty subdirs

**Read for context:**
- `apps/api/src/index.ts` (route registration source of truth)
- `apps/api/src/routes/*` (all route files — copy structure refs)
- `apps/web/src/app/api/auth/callback/google/route.ts` (verify what it does before deletion)

**No change needed:**
- `apps/api/src/routes/*` — route files re-imported from new location

## Implementation Steps
1. **Refactor Hono app for reuse**: extract route registration from `apps/api/src/index.ts` into `apps/api/src/app.ts` (export `app` instance, no `serve()` call).
   - Move all `app.route(...)`, `app.use(...)`, `app.get('/health', ...)` to `app.ts`.
   - `apps/api/src/index.ts` keeps `serve()` for local dev (imports `app` from `./app`).
2. **Move Hono code into web app workspace** (decision point):
   - **Option A (preferred):** Create new package `packages/api-app/` exporting Hono `app`. Both `apps/web` and `apps/api` import from it. KISS: avoids cross-app imports.
   - **Option B:** `apps/web` imports from `apps/api/src/app.ts` directly. Faster but breaks workspace boundary.
   - **Decision:** Option A. New workspace package `@repo/api-app`.
3. **Migrate route files** to `packages/api-app/src/`:
   - `routes/`, `jobs/` (jobs/ logic kept for cron handlers in Phase 03), `utils/`, `schemas/`
   - Update internal relative imports.
4. **Mount in Next.js**: create `apps/web/src/app/api/[[...route]]/route.ts`:
   ```ts
   import { handle } from 'hono/vercel'
   import { app } from '@repo/api-app'
   export const runtime = 'nodejs'
   export const GET = handle(app)
   export const POST = handle(app)
   export const PUT = handle(app)
   export const PATCH = handle(app)
   export const DELETE = handle(app)
   export const OPTIONS = handle(app)
   ```
   - `runtime = 'nodejs'` REQUIRED (Hono uses Node APIs via googleapis, drizzle-postgres).
5. **Audit existing Next.js auth callback** (`auth/callback/google/route.ts`): if logic differs from `routes/integrations/gsc/callback`, port differences into Hono route. Then delete the Next.js file.
6. **Remove Next.js rewrites**: delete `rewrites()` in `apps/web/next.config.js`. API now in same project.
7. **Remove cron startup from `apps/api/src/index.ts`**: move `startAllSyncJobs()` block out (Phase 03 handles via Vercel Cron). Local dev: keep guarded by `ENABLE_CRON=true` env if developer wants to test.
8. **Replace `tsx src/index.ts` start**: `apps/api/package.json` `start` script removed (no production deploy). Keep `dev: tsx watch src/index.ts` only.
9. **Verify rate limiter behavior on serverless**: document known limitation in `apps/web/.env.local.example` — note that `hono-rate-limiter` in-memory store is per-instance. Acceptable for v1; flag for follow-up (Redis/Upstash).
10. **Verify DB connection pooling** <!-- Updated: Validation Session 1 - DB host unknown, pooler check required -->:
    - Check current `DATABASE_URL` format in `.env`:
      - Neon: `postgres://...@*.neon.tech/...` → pooler built-in, use `-pooler` URL variant
      - Supabase: use port `6543` (pgbouncer) instead of `5432`
      - Bare Postgres (Render/other): add `max: 1` to `@repo/db` drizzle config, or add pgbouncer layer
    - Update `packages/db/src/index.ts` if needed for serverless connection limit.
11. **Local smoke test**: `npm run dev --workspace=apps/web`; hit `http://localhost:3002/api/health` → expect 200.
12. **Deploy to Vercel preview**: verify `/api/health`, `/api/projects`, OAuth callback flow.

## Todo List
- [x] Extract Hono `app` to `packages/api-app/` workspace package
- [x] Migrate `routes/`, `utils/`, `schemas/` into `@repo/api-app`
- [x] Add `apps/web/src/app/api/[[...route]]/route.ts` with `handle(app)`
- [x] Add `runtime = 'nodejs'` directive
- [x] Set Hono `basePath('/api')`
- [x] Audit + delete `apps/web/src/app/api/auth/callback/google/route.ts`
- [x] Remove `rewrites()` in `next.config.js`
- [x] Update `apps/api/package.json` (dev-only scripts)
- [x] Strip `serve()` + `startAllSyncJobs()` from `apps/api/src/index.ts` (uses shared `app` from `@repo/api-app`)
- [x] Local smoke test all major routes
- [ ] Deploy preview, verify OAuth flow end-to-end (deferred to Phase 04)
- [x] Document rate-limiter serverless limitation

## Success Criteria
- `curl https://{preview}.vercel.app/api/health` → `{"status":"ok"}`
- All routes from `apps/api/src/index.ts` reachable via web domain
- Google OAuth GSC + GA4 flows complete (token stored in DB)
- `npm run dev` (web) serves API at `:3002/api/*` (no separate API process needed locally)
- No request goes to Render after cutover
- p95 latency for `/api/health` <500ms warm

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hono middleware incompatible with Vercel runtime | L | H | `hono/vercel` adapter is official; smoke-test on preview |
| Rate limiter state lost across invocations | H | M | Document; defer Redis to follow-up; raise per-IP limit during transition |
| `googleapis` cold start >1s on Vercel | M | M | Verify in preview; consider edge-incompatible warning; OAuth flow user-tolerant |
| Drizzle pg connection pool exhaustion (each invocation = new connection) | H | H | Use connection pooling (Neon/Supabase pooler) or `postgres.js` with `max=1`; verify `@repo/db` config |
| Existing auth/callback route not equivalent to Hono route | M | H | Side-by-side compare BEFORE delete; backup branch |
| `[[...route]]` collision with sibling `analytics/` empty dirs | L | L | Delete empty dirs as part of step |
| OAuth redirect URI mismatch | H | H | Phase 04 covers env update; coordinate with Google Console update BEFORE Vercel domain switch |
| Workspace package `@repo/api-app` causes cyclic dep with `@repo/db` | L | M | Verify dep graph: `api-app` depends on `db`, not reverse |

## Security Considerations
- Same-origin in production = CORS not exposing API to other domains
- Rate limiter in-memory = DoS risk per-instance; mitigate via Vercel edge limits + future Redis store
- `runtime = 'nodejs'` exposes filesystem to handler — review for path-traversal in any route
- Auth callback handling cookies: verify `SameSite=Lax`/`Secure` flags work on Vercel domain

## Next Steps
- **Blocks:** Phase 03 (cron handlers must live in same Hono app)
- **Blocks:** Phase 05 (Render removal requires Phase 02 verified)
- **Parallel-safe with:** none (touches `apps/web` heavily)
- **Follow-up:** Redis-backed rate limiter; consider Vercel Edge runtime for read-heavy endpoints
