# Phase 03: Cron Migration to GitHub Actions

**Date**: 2026-04-26 14:30  
**Severity**: High  
**Component**: Infrastructure / Task Scheduling  
**Status**: Resolved

## What Happened

Replaced `node-cron` running on Render with GitHub Actions scheduled workflows calling secured Hono endpoints. The original design would have failed silently on Vercel Hobby plan (10s cron execution limit, GSC sync takes ~40s).

## The Brutal Truth

Vercel Hobby destroyed our original plan. 10-second cron limit is a disaster for any real data sync work. The alternative of paying for Pro tier ($20+/month) just for cron felt wasteful when GitHub Actions is already free and has a 6-hour timeout. We didn't think to check platform constraints upfront before finalizing architecture — that cost us a redesign at implementation time.

## Technical Details

**Created:**
- `verify-cron-secret.ts`: Hono middleware validates Bearer token (fail-closed: returns 401 if `CRON_SECRET` unset)
- `routes/cron/sync-gsc.ts` + `routes/cron/sync-ga4.ts`: HTTP endpoints wrapping `runGSCSync()` and `runGA4Sync()`
- `.github/workflows/cron-sync.yml`: Scheduled at `0 19 * * * UTC`, manually triggerable via `workflow_dispatch`

**Modified:**
- `app.ts`: Registered `/api/cron` route group
- Phase 03 plan: Fixed success criteria + documented double-prefix doc error

**Error handling applied post-review:**
- Added try/catch in both route handlers (previously silent 200 returns even on crash)
- GA4 job: `if: always()` ensures independent execution (GSC failure won't block GA4)
- GitHub Actions: Added `Content-Type: application/json` headers
- Startup warning when `CRON_SECRET` missing

## What We Tried

1. **Vercel Cron** (ruled out): Hobby plan = 10s limit. GSC sync times out silently.
2. **Render cron** (failing): Still running module-scope CronJob instances; complex cleanup across two platforms.
3. **GitHub Actions** (chosen): Free tier, 6h timeout, reliable HTTP trigger. Stateless HTTP call beats embedded scheduler.

## Root Cause Analysis

We didn't validate Vercel platform constraints during the architecture phase. Assumed Vercel Cron would work for "short" jobs without measuring actual sync duration. GitHub Actions was always the better option — it's the platform-agnostic HTTP trigger that scales from single-user to multi-user via a dispatcher pattern (unchanged trigger, only handler logic evolves).

## Lessons Learned

1. **Constraint validation first**: Platform execution limits (Vercel 10s, Render unlimited, GitHub Actions 6h) must be known before design. A 2-minute investigation saves a redesign.
2. **Stateless HTTP > embedded scheduler**: GitHub Actions (or any external cron) decouples the trigger from the app lifecycle. Easier to test, monitor, and migrate.
3. **Fail-closed security**: Bearer token middleware must 401 if secret is missing — not silently succeed. Code review caught this.
4. **Deferred cleanup**: Leaving dead CronJob instances in sync-gsc.ts / sync-ga4.ts is acceptable if Phase 05 (Render removal) owns the cleanup. Prevents premature refactoring.

## Next Steps

1. Verify GitHub Actions fires at 19:00 UTC post-deployment
2. Phase 05 removes Render cron + dead CronJob code
3. If GSC/GA4 sync exceeds 50s at scale, implement dispatcher (QStash/Inngest) in `/api/cron/sync-gsc-dispatcher` (no URL changes, internal refactor)

**Owner**: Infrastructure lead  
**Timeline**: Verified by 2026-04-27  
**Blocked by**: None (Phase 02 Hono mount complete)  
**Blocks**: Phase 05 (Render decommission)
