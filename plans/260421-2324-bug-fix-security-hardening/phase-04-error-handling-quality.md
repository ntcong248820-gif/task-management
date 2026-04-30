# Phase 4 — Error Handling & Code Quality

**Priority:** P2 — Maintainability & robustness
**Status:** ✅ Done
**Issues:** E1–E3 (error handling), Q1–Q5 (code quality)

## Context Links
- Review report: [reviewer-260421-2324-codebase-bugs-and-security.md](../reports/reviewer-260421-2324-codebase-bugs-and-security.md)

---

## E1 — Fix Silent `projectId` Default in `correlation.ts`

### Key Insight
`const projectId = Number(c.req.query('projectId') || 1)` silently returns project 1 data if param is missing. Should return 400 like `analytics.ts` does.

### Related Files
- **Modify:** `apps/api/src/routes/correlation.ts:26`

### Implementation Steps
```ts
// Before
const projectId = Number(c.req.query('projectId') || 1);

// After
const rawProjectId = c.req.query('projectId');
if (!rawProjectId) return c.json({ success: false, error: 'projectId is required' }, 400);
const projectId = Number(rawProjectId);
if (isNaN(projectId)) return c.json({ success: false, error: 'projectId must be a number' }, 400);
```

### Todo
- [x] Fix `projectId` handling in `correlation.ts`

---

## E2 — Validate `days` Parameter on Sync Endpoints

### Key Insight
`days` param on `/sync` routes is parsed with `const { days = 30 } = await c.req.json()` without validation. A caller could pass `days: -1` or `days: 99999`, causing unexpected date ranges or massive data fetches.

### Related Files
- **Modify:** `apps/api/src/routes/integrations/gsc.ts` (sync handler)
- **Modify:** `apps/api/src/routes/integrations/ga4.ts` (sync handler)

### Implementation Steps
```ts
const parsedDays = Math.min(Math.max(parseInt(String(days)) || 30, 1), 365);
```

### Verification
Checked gsc.ts:445 and ga4.ts:384 — already correctly implemented.

### Todo
- [x] Clamp `days` to 1–365 in `gsc.ts /sync`
- [x] Clamp `days` to 1–365 in `ga4.ts /sync`

---

## E3 — Delete Deprecated Frontend Callback Route

### Key Insight
`apps/web/src/app/api/auth/callback/google/route.ts` is self-described as deprecated with leftover `console.log`. Confirm Google Cloud Console doesn't route to this path before deleting.

### Implementation Steps
1. Check Google Cloud Console OAuth credentials — confirm redirect URIs are **only** backend Render URLs (`/api/integrations/gsc/callback`, `/api/integrations/ga4/callback`)
2. If confirmed: `git rm apps/web/src/app/api/auth/callback/google/route.ts`

### Status
⏸️ Deferred — requires Google Cloud Console access to verify redirect URIs.

### Todo
- [ ] Confirm no Google OAuth redirect URI points to `/api/auth/callback/google`
- [ ] Delete `apps/web/src/app/api/auth/callback/google/route.ts`

---

## Q1 — Replace `console.*` with `logger.*` in Route Files

### Key Insight
Logger utility exists at `apps/api/src/utils/logger.ts` but most route files bypass it with 296 raw `console.*` calls. The logger adds level control, context prefixes, and env-aware suppression.

### Related Files (highest priority)
- `apps/api/src/routes/integrations/gsc.ts` — ~40 console calls
- `apps/api/src/routes/integrations/ga4.ts` — ~30 console calls
- `apps/api/src/jobs/sync-gsc.ts`
- `apps/api/src/jobs/sync-ga4.ts`
- `apps/api/src/jobs/index.ts`

### Implementation Steps
At top of each file:
```ts
import { logger } from '../utils/logger';
const log = logger.child('GSC'); // or 'GA4', 'Jobs', etc.
```

Replace `console.log(...)` → `log.info(...)`, `console.error(...)` → `log.error(...)`, etc.

### Todo
- [x] Replace console calls in `gsc.ts`
- [x] Replace console calls in `ga4.ts`
- [x] Replace console calls in `jobs/sync-gsc.ts`
- [x] Replace console calls in `jobs/sync-ga4.ts`
- [x] Replace console calls in `jobs/index.ts`

---

## Q2 — Replace `any` Types in Google API Clients

### Key Insight
`GA4Client` and `GSCClient` use `private oauth2Client: any` and `private analyticsdata: any`. Proper types are available from `googleapis`.

### Related Files
- **Modify:** `apps/api/src/routes/integrations/ga4.ts:9-10`
- **Modify:** `apps/api/src/routes/integrations/gsc.ts:9-10`

### Implementation Steps
```ts
import type { Auth } from 'googleapis';

private oauth2Client: Auth.OAuth2Client;
private analyticsdata: ReturnType<typeof google.analyticsdata>;
```

### Todo
- [x] Type `oauth2Client` and `analyticsdata` in `GA4Client`
- [x] Type `oauth2Client` and `searchconsole` in `GSCClient`

---

## Q3 — Remove `.js` Build Artifacts from Git

### Key Insight
`packages/db/src/schema/` contains 8 `.js` files alongside `.ts` source. Build artifacts should not be versioned.

### Implementation Steps
1. Add to root `.gitignore`:
```
packages/db/src/**/*.js
packages/db/src/**/*.d.ts
```
2. Remove tracked files: `git rm --cached packages/db/src/schema/*.js`

### Todo
- [x] Add gitignore rules for `packages/db/src/**/*.js`
- [x] Run `git rm --cached packages/db/src/schema/*.js packages/db/src/schema/index.js`
- [x] Verify `npm run build` still produces them correctly

---

## Q4 — Fix `jobs/index.ts` Mixing ESM and `require()`

### Key Insight
`startAllSyncJobs()` uses `require('./sync-gsc')` inside function body despite top-level ES imports being used throughout the file. This is CJS in an ESM context and could fail at runtime.

### Related Files
- **Modify:** `apps/api/src/jobs/index.ts`

### Implementation Steps
```ts
// Remove require() calls inside functions
// Use top-level ES imports instead:
import { startGSCSyncJob } from './sync-gsc';
import { startGA4SyncJob } from './sync-ga4';

export function startAllSyncJobs() {
  startGSCSyncJob();
  startGA4SyncJob();
  log.info('All sync jobs started');
}
```

### Todo
- [x] Remove `require()` calls from `jobs/index.ts`
- [x] Use top-level ES imports instead

---

## Q5 — Allow Cron Jobs in Non-Production via Env Flag

### Key Insight
`if (process.env.NODE_ENV === 'production')` prevents cron from running locally. Impossible to test sync jobs in dev.

### Related Files
- **Modify:** `apps/api/src/index.ts:162`

### Implementation Steps
```ts
// Before
if (process.env.NODE_ENV === 'production') {
  startAllSyncJobs();
}
// After
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  startAllSyncJobs();
}
```

Add `ENABLE_CRON=false` to `.env.example`.

### Todo
- [x] Add `ENABLE_CRON` flag to cron startup condition in `index.ts`
- [x] Add `ENABLE_CRON=false` to `.env.example`

### Success Criteria
- [x] `correlation.ts` returns 400 on missing `projectId`
- [x] Sync endpoints reject `days < 1` or `days > 365`
- [x] No `.js` files in `packages/db/src/schema/` in git
- [x] `jobs/index.ts` has no `require()` calls
- [x] Setting `ENABLE_CRON=true` starts cron jobs in dev

---

## Implementation Journal

### 2026-04-25 19:02 — Phase 4 Completed

All 7 actionable issues (E1, E2, Q1-Q5) completed. E3 deferred.

**Verification:**
- TypeScript (API): ✅ Pass
- Tests: ✅ 38 passed (28 API + 10 Web)
- Code Review: ✅ All concerns addressed

**Files Changed:**
- `apps/api/src/routes/correlation.ts` — E1: projectId validation
- `apps/api/src/routes/integrations/gsc.ts` — Q1: logger, Q2: types
- `apps/api/src/routes/integrations/ga4.ts` — Q1: logger, Q2: types
- `apps/api/src/jobs/sync-gsc.ts` — Q1: logger, Q2: types
- `apps/api/src/jobs/sync-ga4.ts` — Q1: logger, Q2: types
- `apps/api/src/jobs/index.ts` — Q4: ESM imports
- `apps/api/src/index.ts` — Q5: ENABLE_CRON flag
- `apps/api/.env.example` — Q5: ENABLE_CRON
- `.gitignore` — Q3: build artifacts

**Commits:**
- `d718ca5` — fix: phase-4 error handling and code quality improvements
- `c6eb94f` — docs: update phase-04 with implementation journal entry
- `a8b18ae` — docs: mark phase-04 as done in plan.md