# Phase 03 — Cron Migration (GitHub Actions)

<!-- Updated: Validation Session 1 - Switched from Vercel Cron to GitHub Actions (Hobby plan = 10s limit) -->

**Status:** complete | **Priority:** P1 | **Effort:** 1.5h
**Fixes:** #2

## Context Links
- [Plan overview](./plan.md)
- [Phase 02: Hono in Next.js](./phase-02-hono-into-nextjs.md) (blocker)
- [Researcher 01: Vercel Cron section](./research/researcher-01-vercel-hono-migration.md)

## Overview
Replace `node-cron`/`cron` package with **GitHub Actions scheduled workflows** calling secured Hono endpoints. Vercel Cron was ruled out: Hobby plan = 10s execution limit (GSC sync would timeout). GitHub Actions has 6h timeout, free tier sufficient.

**Scaling note:** GitHub Actions is the _trigger_ only. When the app grows multi-user, fan-out logic lives in the API handler (QStash/Inngest/Bull). The trigger stays the same regardless of user count.

## Key Insights
- GitHub Actions `schedule:` cron fires a job that runs `curl -X POST /api/cron/sync-gsc -H "Authorization: Bearer $CRON_SECRET"`.
- `CRON_SECRET` stored in GitHub repository Secrets (not committed).
- Cron handler routes live in Hono under `/api/cron/*` — same as originally planned, only the _caller_ changes.
- Vercel Hobby = 10s cron exec limit; **do NOT add `crons[]` to `vercel.json`** — it would timeout silently.
- Local dev: keep `ENABLE_CRON=true` flag for `apps/api` to start in-process scheduler.
- Schedule: `0 19 * * *` UTC = 02:00 ICT (UTC+7), same as existing node-cron schedule.

## Requirements
- Functional: GSC + GA4 sync run daily at 19:00 UTC (02:00 ICT). Failures logged. Idempotent (safe to re-run).
- Non-functional: Each invocation completes <50s (10s buffer). If can't, fan-out per-project.

## Architecture
```
GitHub Actions (schedule: 0 19 * * *)
  → runs curl POST https://{domain}/api/cron/sync-gsc
       -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  → Next.js catch-all → Hono → /api/cron/sync-gsc handler
  → Verify Bearer token
  → Run runGSCSync() (existing logic from apps/api/src/jobs/sync-gsc.ts)
  → Return {ok: true, durationMs, projectsSynced}
  ← GitHub Actions logs response + exits
```

**Future scale path (multi-user, many projects):**
```
GitHub Actions trigger (unchanged)
  → /api/cron/sync-gsc-dispatcher
  → enumerates all user connections
  → enqueues per-user jobs to QStash/Inngest
  → returns immediately
Each queue worker → 1 user's sync (isolated, retriable)
```

## Related Code Files
**Create:**
- `packages/api-app/src/routes/cron/index.ts` — cron route group with auth middleware
- `packages/api-app/src/routes/cron/sync-gsc.ts` — wraps `runGSCSync()`
- `packages/api-app/src/routes/cron/sync-ga4.ts` — wraps `runGA4Sync()`
- `packages/api-app/src/utils/verify-cron-secret.ts` — Bearer token check
- `.github/workflows/cron-sync.yml` — GitHub Actions schedule trigger

**Modify:**
- `packages/api-app/src/app.ts` — register `app.route('/api/cron', cronRoutes)`
- **DO NOT add `crons[]` to `vercel.json`** — Hobby plan would timeout silently
- `packages/api-app/src/jobs/sync-gsc.ts` — already exports `runGSCSync()`; no change
- `packages/api-app/src/jobs/sync-ga4.ts` — already exports `runGA4Sync()`; verify
- `packages/api-app/src/jobs/index.ts` — keep `startAllSyncJobs()` for local-dev use only
- `apps/api/src/index.ts` — guard `startAllSyncJobs()` behind `ENABLE_CRON === 'true'` only (already conditional)

**Read for context:**
- `apps/api/src/jobs/sync-gsc.ts` (lines 131-232 — main logic)
- `apps/api/src/jobs/sync-ga4.ts`

## Implementation Steps
1. **Create cron auth middleware** (`utils/verify-cron-secret.ts`):
   ```ts
   import { createMiddleware } from 'hono/factory'
   export const verifyCronSecret = createMiddleware(async (c, next) => {
     const auth = c.req.header('authorization')
     if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
       return c.json({ error: 'Unauthorized' }, 401)
     }
     await next()
   })
   ```
2. **Create cron routes** (`routes/cron/sync-gsc.ts`):
   ```ts
   import { Hono } from 'hono'
   import { runGSCSync } from '../../jobs/sync-gsc'
   import { verifyCronSecret } from '../../utils/verify-cron-secret'
   const app = new Hono()
   app.use('*', verifyCronSecret)
   app.post('/sync-gsc', async (c) => {
     const start = Date.now()
     await runGSCSync()
     return c.json({ ok: true, durationMs: Date.now() - start })
   })
   export default app
   ```
3. **Register in main Hono app** (`app.ts`):
   ```ts
   // basePath is already '/api', so register as '/cron' — produces /api/cron/*
   app.route('/cron', cronRoutes)
   ```
4. **Generate `CRON_SECRET`**:
   ```bash
   openssl rand -hex 32
   ```
   Store in: GitHub repository Secrets (`CRON_SECRET`) AND Vercel env vars (Production scope).
5. **Create GitHub Actions workflow** (`.github/workflows/cron-sync.yml`):
   ```yaml
   name: Daily SEO Sync
   on:
     schedule:
       - cron: '0 19 * * *'   # 02:00 ICT (UTC+7)
     workflow_dispatch:         # allow manual trigger
   jobs:
     sync-gsc:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger GSC Sync
           run: |
             curl -f -X POST https://${{ secrets.APP_URL }}/api/cron/sync-gsc \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
     sync-ga4:
       runs-on: ubuntu-latest
       needs: sync-gsc   # stagger: GA4 runs after GSC
       steps:
         - name: Trigger GA4 Sync
           run: |
             curl -f -X POST https://${{ secrets.APP_URL }}/api/cron/sync-ga4 \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```
   - `APP_URL` and `CRON_SECRET` in GitHub Secrets
   - `workflow_dispatch` enables manual one-click trigger from GitHub UI
   - `needs: sync-gsc` staggers jobs to avoid concurrent DB writes
6. **Disable in-process cron in production**: confirm `apps/api/src/index.ts` only starts cron when `ENABLE_CRON === 'true'` (local dev opt-in only).
7. **Manual trigger test (post-deploy)**:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://{domain}/api/cron/sync-gsc
   ```
   Verify 200 + DB rows inserted.
8. **Verify GitHub Actions fires**: merge to main, check Actions tab at 19:00 UTC.

## Todo List
- [x] Create `verify-cron-secret.ts` middleware
- [x] Create `routes/cron/sync-gsc.ts`
- [x] Create `routes/cron/sync-ga4.ts`
- [x] Register `/api/cron` route group in `app.ts`
- [x] Generate `CRON_SECRET` (`openssl rand -hex 32`)
- [x] Store `CRON_SECRET` + `APP_URL` in GitHub Secrets
- [x] Store `CRON_SECRET` in Vercel env vars (Production)
- [x] Create `.github/workflows/cron-sync.yml`
- [x] Manual curl test in production (POST with Bearer)
- [x] Verify GitHub Actions fires at 19:00 UTC (Actions tab)

## Success Criteria
- `.github/workflows/cron-sync.yml` present; workflow visible in GitHub Actions tab
- Manual `curl` to `/api/cron/sync-gsc` with valid Bearer = 200 + rows in `gscData` table
- Manual `curl` without/wrong Bearer = 401
- Scheduled invocation fires at 19:00 UTC (visible in GitHub Actions tab, not Vercel logs)
- Duration < 60s (else dispatcher pattern in place)
- Render `node-cron` no longer runs (verified by Render logs going silent post-pause in Phase 05)
- **DO NOT** add `crons[]` to `vercel.json` — Hobby plan 10s limit would timeout silently

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GSC sync exceeds 60s | H | H | Spike measurement step 6; dispatcher fan-out fallback |
| Concurrent dispatcher invocations exhaust DB pool | M | H | Limit fan-out concurrency to 5; use connection pooler |
| `CRON_SECRET` leaks via logs | L | H | Don't log Authorization header; verify Hono `logger()` config |
| Vercel Cron timezone confusion (UTC) | M | M | Document UTC schedule explicitly in code comments |
| Duplicate sync if Render still runs in parallel | M | M | Phase 05 deactivates Render; intermediate state safe (idempotent upsert) |
| Hobby plan limited to 2 crons | L | M | Verify Vercel plan tier; Pro = unlimited |

## Security Considerations
- `CRON_SECRET` rotated annually or on suspected leak
- Auth check FIRST in middleware chain (before any DB access)
- Don't expose cron route paths in API docs / robots.txt
- Vercel auto-injects request from `vercel.com` IP — secret check is primary defense
- Log only success/duration, not request body or token

## Next Steps
- **Blocked by:** Phase 02 (Hono mount must work)
- **Blocks:** Phase 05 (Render removal needs proven cron replacement)
- **Follow-up:** if dispatcher needed, evaluate QStash/Inngest for >100 project scale
