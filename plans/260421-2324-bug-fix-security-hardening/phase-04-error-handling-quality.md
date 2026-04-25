# Journal Entry — Phase 4 Implementation

**Date:** 2026-04-25
**Time:** 19:02
**Phase:** Phase 4 — Error Handling & Code Quality
**Plan:** [260421-2324-bug-fix-security-hardening](./plan.md)

## Context

Phase 4 of the Bug Fix & Security Hardening plan encompasses 8 issues:
- E1-E3: Error handling improvements
- Q1-Q5: Code quality improvements

## Implementation Summary

### E1 — Fix Silent `projectId` Default in `correlation.ts`
**Status:** ✅ Completed

Fixed `correlation.ts` to return 400 if `projectId` is missing or not a number. Previously it silently defaulted to 1.

### E2 — Validate `days` Parameter on Sync Endpoints
**Status:** ✅ Verified (already implemented)

Verified that `gsc.ts` and `ga4.ts` both clamp `days` to 1-365 range using `Math.min(Math.max(parseInt(rawDays) || 30, 1), 365)`. No changes needed.

### E3 — Delete Deprecated Frontend Callback Route
**Status:** ⏸️ Skipped — Requires Google Cloud Console Access

Found that `apps/web/.env.local` references `http://localhost:3002/api/auth/callback/google` as `GOOGLE_REDIRECT_URI`. The deprecated route at `apps/web/src/app/api/auth/callback/google/route.ts` is still referenced in env configs. Deleting requires verifying Google Cloud Console OAuth redirect URIs first — which requires access to the Google Cloud Console that I don't have. User must confirm before deletion.

### Q1 — Replace `console.*` with `logger.*`
**Status:** ✅ Completed

Replaced all `console.log/error/warn` with structured logger in:
- `apps/api/src/routes/integrations/gsc.ts`
- `apps/api/src/routes/integrations/ga4.ts`
- `apps/api/src/jobs/sync-gsc.ts`
- `apps/api/src/jobs/sync-ga4.ts`
- `apps/api/src/jobs/index.ts`

Each file now uses `const log = logger.child('Context')` for contextual logging.

### Q2 — Replace `any` Types in Google API Clients
**Status:** ✅ Completed

Typed all inline Google API clients:
- `oauth2Client: Auth.OAuth2Client` (imported from `googleapis`)
- `searchconsole: ReturnType<typeof google.searchconsole>`
- `analyticsdata: ReturnType<typeof google.analyticsdata>`

Applied to all 4 files (gsc.ts, ga4.ts, sync-gsc.ts, sync-ga4.ts).

### Q3 — Remove `.js` Build Artifacts from Git
**Status:** ✅ Completed

- Added to `.gitignore`:
  ```
  packages/db/src/**/*.js
  packages/db/src/**/*.d.ts
  ```
- Removed 8 `.js` files from git tracking via `git rm --cached`

### Q4 — Fix `jobs/index.ts` Mixing ESM and `require()`
**Status:** ✅ Completed

Converted `jobs/index.ts` from using `require('./sync-gsc')` inside function body to proper ES imports at top level.

### Q5 — Allow Cron Jobs in Non-Production via Env Flag
**Status:** ✅ Completed

- Updated `index.ts` condition: `if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true')`
- Added `ENABLE_CRON=false` to `apps/api/.env.example`

## Verification

| Check | Result |
|-------|--------|
| TypeScript (API only) | ✅ Pass |
| Tests | ✅ 38 passed (28 API + 10 Web) |
| Code Review | ✅ All issues addressed |

## Unresolved Questions

1. **E3 (Deprecated callback route deletion):** Requires Google Cloud Console access to verify no OAuth redirect URIs point to `/api/auth/callback/google`. The route file remains for now.

## Files Changed

```
apps/api/src/routes/correlation.ts        # E1: projectId validation
apps/api/src/routes/integrations/gsc.ts   # Q1: logger, Q2: types
apps/api/src/routes/integrations/ga4.ts   # Q1: logger, Q2: types
apps/api/src/jobs/sync-gsc.ts             # Q1: logger, Q2: types
apps/api/src/jobs/sync-ga4.ts             # Q1: logger, Q2: types
apps/api/src/jobs/index.ts                # Q4: ESM imports
apps/api/src/index.ts                     # Q5: ENABLE_CRON flag
apps/api/.env.example                    # Q5: ENABLE_CRON
.gitignore                               # Q3: build artifacts
```

## Next Steps

1. Commit all changes
2. Update phase-04 file to mark completed
3. Update plan.md to mark Phase 4 as done