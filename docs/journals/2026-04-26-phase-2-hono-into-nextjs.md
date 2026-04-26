# Phase 02: Hono into Next.js Route Handlers — Consolidation Wins, Serverless Complexity Emerges

**Date**: 2026-04-26 14:30
**Severity**: High
**Component**: API routing, infrastructure, deployment
**Status**: Resolved

## What Happened

Consolidated the standalone Render backend into Next.js on Vercel. Moved from a two-service architecture (web on Vercel, API on Render) to a single monolith where Hono routes live inside Next.js via the `hono/vercel` adapter. This eliminated the separate API server, simplified deployment, and unified CORS handling to same-origin.

## The Brutal Truth

This phase revealed that serverless architectures demand completely different thinking about state and connection pooling. The satisfaction of eliminating Render's $7/month bill was immediately tempered by discovering that in-memory rate limiting becomes per-invocation state — essentially useless for DoS protection in serverless. The smoke tests passed cleanly, but that success masked a cascade of serverless gotchas that only appear under real traffic.

## Technical Details

**Architecture shift:**
- `apps/web/src/app/api/[[...route]]/route.ts` mounted with `hono/vercel` adapter
- Hono configured with `basePath('/api')` so route prefixes stayed `/projects`, not `/api/projects`
- Created `packages/api-app/` workspace to share Hono instance between dev server (`apps/api`) and production (`apps/web`)
- Deleted `/apps/web/src/app/api/auth/callback/google/route.ts` — OAuth callback logic absorbed into Hono routes

**Smoke tests:**
```
✓ GET /api/health → 200 OK
✓ GET /api/projects → 200 (returns actual data)
✓ GET /api/integrations/gsc/callback?error=test → 302 redirect
✗ GET /api/integrations/status → 500 (DB not seeded, expected)
```

**Critical limitation discovered:**
In-memory rate limiter (`hono-rate-limiter`) stores state per-invocation. Vercel cold-starts spawn fresh instances — each with empty limiter state. This means rate limits apply per-instance, not globally. A bad actor can hit different cold starts and bypass all limits. Documented but not fixed (deferred to Phase 06 with Redis/Upstash).

**SWC downgrade pain:**
Next.js 15.5.9 required but the arm64 SWC binary wasn't available on npm for the macOS dev environment. Downgraded to 15.3.0. Not a blocker for production but indicates fragile dependency chain. Spent 20 minutes debugging build errors before identifying the binary availability issue.

## What We Tried

1. **Workspace boundary:** Initially tried `apps/web` importing directly from `apps/api/src`. Rejected — violates workspace isolation.
2. **No basePath:** Tried mounting Hono at root without `basePath('/api')`. Would have required rewriting every route. Expensive. Kept `basePath('/api')` instead.
3. **In-process rate limiting:** Attempted to detect "production" vs "dev" and use Redis conditionally. Too complex for Phase 02. Documented and deferred.

## Root Cause Analysis

**Why serverless state breaks:** Vercel uses function-as-a-service. Each incoming request can spawn a new isolate; containers are destroyed after idle timeout. In-memory state (counters, caches, connection pools) lives only within an invocation. This is the fundamental serverless contract: **assume nothing persists between requests**. We built with stateful server assumptions (always-hot process, shared memory) but deployed to stateless infrastructure. The smoke test passed because consecutive requests hit the same warm container — real traffic distributes across cold starts.

**Why we didn't catch this earlier:** Phase 01 was pure configuration. No code executed. Phase 02 smoke tests run in-process; they never trigger cold-starts. Serverless limitations only manifest under production load.

## Lessons Learned

1. **Serverless requires rearchitecture, not just redeployment.** Lifting a Node.js app from a traditional server to Vercel is not a port — it's a migration. State management, connection pooling, and initialization code all need rethinking.

2. **Test on the actual platform, not locally.** Smoke tests passing locally (warm container, persistent memory) are insufficient. Need to deploy to preview and stress-test with concurrent requests to reveal cold-start behavior.

3. **Rate limiting in serverless needs external store.** In-memory state cannot work. This should have been flagged during architectural review. Accept that Phase 02 is rate-limiter-unsafe and document the gap explicitly.

4. **DB connection pooling is non-optional for serverless.** Drizzle with `pool.max = 1` or Neon's pooler URL is required. Current config will exhaust the connection pool under concurrent load. Need to verify `packages/db/src/index.ts` config before production traffic.

5. **SWC binary availability shouldn't block progress.** Next.js dependency chain is tighter than it should be. The 15.5.9 → 15.3.0 downgrade works but signals we're on the edge of supported configurations. Future upgrades may fail similarly.

## Next Steps

**Critical (must fix before production traffic):**
- [ ] Verify DB connection pool config in `packages/db/src/index.ts` for serverless (Neon pooler URL or `max: 1`)
- [ ] Deploy to Vercel preview, run concurrent load test (100+ requests/sec) for 5 minutes
- [ ] Monitor cold-start latency (p95 must be <800ms per plan)
- [ ] Verify OAuth callback flow works end-to-end on preview domain

**Important (Phase 03/04):**
- [ ] Implement Redis-backed rate limiter (defer to Phase 06 per plan, but flag as blocking for traffic)
- [ ] Document serverless limitations in `./docs/deployment-guide.md`

**Nice-to-have:**
- [ ] Investigate SWC binary availability for 15.5.9+ (upgrade path for future Next.js versions)

**Owner:** DevOps/Infrastructure lead
**Timeline:** Preview testing before Render cutoff; production deployment after Phase 03 cron handlers verified
