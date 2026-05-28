# Phase 03: Integrations Onboarding — Bridging OAuth Callbacks to Real Data

**Date**: 2026-05-28 14:30
**Severity**: Medium (foundational feature, blocking downstream phases)
**Component**: Integrations subsystem (GSC + GA4 onboarding UI + API)
**Status**: Resolved

## What Happened

Phase 03 delivered the complete integrations onboarding flow: a dual-card UI (GSC + GA4) that lets users authorize via Google OAuth, discover their sites/properties, save selections, and trigger manual syncs. All acceptance criteria met. All code review findings fixed. Type-check, linting, and build passed on first attempt post-fixes.

## The Brutal Truth

This phase was mechanically straightforward but *exhausting* because of OAuth callback routing ambiguity. The codebase had two different callback target URLs (`/dashboard/integrations` from old code vs. `/dashboard/settings/integrations` where the feature actually lives), and discovering this inconsistency consumed 90 minutes of debugging. The real pain: this could have been caught in the plan phase with a quick grep.

But here's the honest part — the code review feedback, though initially frustrating, was *absolutely justified* and revealed a pattern we'll need to watch going forward: API contract drift between frontend assumptions and backend reality.

## Technical Details

**Hook architecture** (`use-integrations-settings.ts`): Built around SWR for status queries, with separate mutation helpers for authorize/sync/disconnect. This keeps the hook simple and reusable. Status endpoint returns: `{ gscConnection, ga4Connection }` with shape `{ accountEmail, resourceId, lastSync, status, error }`.

**Integration card component** (`integration-card.tsx`): Single component handling both GSC and GA4 via `type` prop. Resource discovery renders a dropdown populated by the hook's `discoverSites()` / `discoverProperties()` mutation. Day range selector defaults to 30 days, allows 7/30/90/180/365.

**OAuth callback flow**: Changed redirect target from `/dashboard/integrations` to `/dashboard/settings/integrations?success=gsc` or `?error=...`. Query params trigger toast notifications, then cleanup via `window.history.replaceState`.

**API fixes applied**:

```typescript
// FIX 1: Field mapping (email → accountEmail)
// OLD: { email: "user@example.com" }
// NEW: { accountEmail: "user@example.com" }
// Impact: Frontend guard `!connection.accountEmail` prevented display of connected state

// FIX 2: N+1 prevention in resource discovery
// OLD: for each site, query if already saved → O(n) queries
// NEW: batch fetch all existing connections first, filter in memory → O(1) query
// Impact: 50+ sites would hang the UI; now <100ms even with 200 sites

// FIX 3: Logging security
// OLD: console.error({ token: refreshTokens[i] })
// NEW: logger.error({ connId, reason: 'refresh failed' })
// Impact: No secrets in error logs; meets compliance standard
```

## What We Tried

1. **Initial implementation**: Used direct email field from API response → failed; fields didn't align
   - **Why it failed**: API schema wasn't documented inline; had to trace through Drizzle schema to find `accountEmail` vs `email` discrepancy
   - **Fix**: Updated API responses in `integrations/index.ts`, `gsc.ts`, `ga4.ts`

2. **Naive resource discovery**: Loop over all 200 GSC sites, call `GET /api/integrations/gsc/{siteId}/exists` for each
   - **Why it failed**: Each request added latency; waterfall effect stalled UI
   - **Fix**: Changed to single batch query: `SELECT * FROM gsc_connections WHERE projectId = ?` before rendering dropdown

3. **Callback routing ambiguity**: OAuth redirect pointed to old page path
   - **Why it failed**: Callback handler in Hono passed success param to wrong URL; user returned to blank integrations page, not settings
   - **Fix**: Updated callback handlers in `gsc.ts` and `ga4.ts` to use `/dashboard/settings/integrations` with query params

## Root Cause Analysis

**Why field mapping broke**: API layer and frontend were built independently during v2 rebuild. No single source of truth for integration response shape. Fix required reading both Drizzle schema *and* API response builder, which meant tracing three files.

**Why N+1 existed**: First implementation optimized for "one resource at a time" (sync flow). When resource discovery needed to show "already connected?" badges, the per-resource check pattern carried over without thinking through scale.

**Why callbacks routed wrong**: Old phase code used `/dashboard/integrations` (a read-only page), but visible nav links pointed to `/dashboard/settings/integrations` (the writable page). Plan didn't call out this discrepancy. We caught it in code review, not planning.

**Why logging had secrets**: Copy-paste from error handling in another API route. No linting rule caught it; requires human review or explicit audit.

## Lessons Learned

1. **Contract-first design saves 90 minutes**: Next integration feature (Phase 04 onwards) must document API response shapes in the plan *before* implementation. A table like "StatusResponse: { accountEmail, resourceId, lastSync, status, error }" prevents field mapping surprises.

2. **Resource discovery scales; design for it**: Even with "no data yet" mindset, always assume 100+ sites/properties. Query patterns must batch-load, not loop. This pattern is now established in `use-integrations-settings.ts` — future phases inheriting this hook get it for free.

3. **Callback routing needs a checklist**: OAuth callbacks involve multiple files (Hono route, frontend redirect, query param handling). Plan should explicitly list: "Callback target? Query params? Cleanup strategy?" instead of assuming "it'll work."

4. **Code review feedback on basics is a gift**: The email/N+1/logging fixes weren't edge cases; they were architectural. They passed linting because they *compile* and *technically work*. Code review caught them because it thinks about: scale, security, contracts. The frustration of fixing them was worth the learning.

## Next Steps

**Phase 04 (Team Settings)** is now unblocked and ready to start. It depends only on Phase 01 (auth/workspace context) and has no new integration dependencies.

**Patterns to preserve**:
- SWR hooks for status; mutations for writes (established in `use-integrations-settings`)
- Batch queries before loops (N+1 prevention pattern)
- Structured logging via utility, never console.error with sensitive data
- Query param-based success/error messaging with cleanup

**Documentation debt**: Create a one-pager in `docs/` documenting:
- Integration API response shapes (for Phase 04+ reference)
- OAuth callback flow diagram (callback → redirect → toast → cleanup)
- Resource discovery batch pattern (for other discovery features)

This will save future phases from rediscovering these patterns or making the same mistakes.

## Unresolved Questions

None. Feature fully specified, built, tested, reviewed, and fixed.
