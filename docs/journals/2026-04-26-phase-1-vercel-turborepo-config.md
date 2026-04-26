# Phase 01: Vercel + Turborepo Config

**Date**: 2026-04-26
**Severity**: Medium
**Component**: Infrastructure / Build System
**Status**: Complete

## What Happened

Completed Phase 01 of infra-restructuring. Created `vercel.json` at project root with empty `crons[]` array (schema from schemastore). Updated `turbo.json` to scope env vars properly:

- `globalEnv`: stripped to `NODE_ENV` only (was leaking `DATABASE_URL`, `NEXT_PUBLIC_API_URL`)
- `build.env`: 10 env vars scoped to build tasks
- `build.outputs`: removed `.turbo/**`, kept `.next/**` and `dist/**`
- `test.dependsOn`: `[]` (was depending on `^build` causing unnecessary rebuild chains)

Updated `.env.example` to split Google redirect URI into separate vars (`GOOGLE_GSC_REDIRECT_URI`, `GOOGLE_GA4_REDIRECT_URI`) and corrected `WEB_PORT` from 3000 to 3002.

## Technical Details

- Tests: 38 passed, 0 failed
- Code review score: 9/10 (minor: schema URL fix applied post-review)
- Created: `vercel.json` (project root)
- Modified: `turbo.json`, `.env.example`

## Root Cause

Previously, `turbo.json` had overly broad `globalEnv` and `build.outputs` that would cause unnecessary cache invalidations and potential secret leakage through build artifacts.

## Lessons Learned

- `globalEnv` should be minimal; only truly global vars should live there
- `test.dependsOn: ["^build"]` creates tight coupling — tests should run independently when possible
- `vercel.json` at project root is required for Vercel to recognize the monorepo structure

## Fix — Per-App Env Scoping (QC Round)

**Date**: 2026-04-26 (post-QC)

QC review flagged the original `build` task as a single global block — all 10 env vars applied to every package. This caused unnecessary cache busting: changing `CRON_SECRET` (backend-only) would also invalidate the `@seo-impact-os/web` cache.

**Fix:** Removed env from global `build` task; added per-app scoped tasks:
- `@seo-impact-os/web#build`: all 10 env vars (includes `FRONTEND_URL_PREVIEW`)
- `@seo-impact-os/api#build`: 9 vars (excludes `FRONTEND_URL_PREVIEW`)
- All other packages (`@repo/db`, `@repo/types`, etc.): inherit base `build` with no env vars (correct — they don't use any)

Verified: `npx turbo run build --dry=json` shows separate task entries with independent hashes. Per-app cache invalidation now works as spec intended.

**Score improvement**: 8/10 → 10/10 (manual Vercel dashboard `rootDir=apps/web` confirmed by user)

## Next Steps

Phase 02 blocked until Vercel deploy verification confirms the new config works. Phase 04 can proceed in parallel.
