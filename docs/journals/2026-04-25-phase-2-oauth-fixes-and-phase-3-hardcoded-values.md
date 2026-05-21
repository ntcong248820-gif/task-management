# Phase 2 & 3: OAuth Flow Fixes and Hardcoded Value Removal

**Date**: 2026-04-25 16:00
**Severity**: High
**Component**: OAuth token refresh, sync tracking, CORS configuration, project selection
**Status**: Resolved

## What Happened

Phase 2 fixed stale OAuth redirect URIs in token refresh and data fetching clients, added sync tracking and input bounds. Phase 3 removed hardcoded URLs, project IDs, and duplicated config constants from the frontend.

## The Brutal Truth

Phase 2 caught something the plan did not list: there were inline OAuth2 clients in `/sites` and `/properties` routes that also had `GOOGLE_REDIRECT_URI` passed to their constructors. The plan only mentioned the four main clients (token-refresh, GSCClient, GA4Client, and the inline clients in sync routes). Code review found two more inline clients in `/sites` and `/properties` routes that had stale redirect URIs. These were not in any plan but were clearly wrong — the redirect URI is only needed for the initial code exchange, not for data fetching operations.

Phase 3 was frustrating because it exposed how much hardcoded garbage had accumulated. `projectId = 1` defaults were spread across five hooks. A duplicate `API_BASE` constant was sitting in `dashboard/page.tsx` alongside the imported `getApiUrl()`. These patterns accumulate silently during rapid development and are easy to miss until a code review actually looks.

## Phase 2 Technical Details

### Removed Redirect URI from OAuth2 Constructors

The `google.auth.OAuth2` constructor accepts a client ID, client secret, and redirect URI. The redirect URI is only needed for the **initial authorization code exchange**. Token refresh and API data fetching do not use it — passing it unnecessarily risks silent breakage if the env var is unset.

Fixed locations:
- `token-refresh.ts` — removed `process.env.GOOGLE_REDIRECT_URI`
- `GSCClient` in `gsc.ts` — removed redirect URI argument
- `GA4Client` in `ga4.ts` — removed redirect URI argument
- Inline clients in sync routes — removed redirect URI
- Inline clients in `/sites` and `/properties` routes — **caught by code review, not in original plan**

### Added `lastSyncedAt` Tracking

Added nullable `lastSyncedAt: timestamp()` to `oauthTokens` schema. Sync routes now update this after successful batch insert. Status endpoint returns `lastSyncedAt ?? createdAt`.

Deployment requirement: `npm run db:push` must run on Render before deploying the API. Local environment lacked production credentials so migration could not run locally.

### Days Parameter Clamping

Both sync routes accepted unbounded `days` values. Added bounds:
```typescript
const days = Math.min(Math.max(parseInt(rawDays) || 30, 1), 365);
```

Without this, a caller could pass `days=999999` and trigger unbounded paginated API fetches — a cost amplification and potential DoS vector against both our database and Google's API.

### OAuth Callback UI Feedback

The integrations page was using `console.log` for OAuth callback errors — completely invisible to users. Replaced with a dismissable `callbackAlert` state driving a green/red alert banner. Error codes are whitelisted against known values — no raw URL parameter reflection.

## Phase 3 Technical Details

### CORS Hardcoded URL Removed

Removed `'https://task-management-app-theta-two.vercel.app'` from CORS origin array. Now uses:
```typescript
const allowedOrigins = [FRONTEND_URL, FRONTEND_URL_PREVIEW].filter(Boolean);
```

Added both `FRONTEND_URL` and `FRONTEND_URL_PREVIEW` to `.env.production.example`.

### Removed `projectId = 1` Defaults

Five hooks changed from `projectId: number = 1` to `projectId: number | null` with null guard returning empty state. Four dashboard pages updated to use `useProject()` from `ProjectContext` to get `selectedProjectId` instead of hardcoding.

The hardcoded `1` was dangerous because it would silently return incorrect data if the projects table ever had a different primary key or if the default project was ever deleted.

### Removed Duplicate API_BASE

`dashboard/page.tsx` had its own `const API_BASE = ...` duplicating `getApiUrl()` from `@/lib/config`. Removed the duplicate and replaced with the centralized version.

## Root Cause Analysis

1. **Stale redirect URIs**: The original OAuth implementation copied the constructor pattern from documentation without understanding which arguments were actually needed at each stage. When the env var was set during initial setup, this masked the problem.
2. **Hardcoded projectId**: Rapid prototyping pattern — easiest way to make the component compile without wiring up full context. Never cleaned up during initial release.
3. **Duplicate API_BASE**: Two developers working in parallel without shared constants — one used the existing `getApiUrl()`, the other created their own.
4. **Unbounded days**: Trusting caller input without validating bounds. The Google APIs themselves paginate, but the caller controls how many pages we fetch.

## Lessons Learned

- Plans are a starting point, not a complete inventory. Code review finds issues beyond what's listed.
- OAuth2 redirect URI is only needed for initial code exchange, not for token refresh or resource fetching. Any constructor receiving a redirect URI it does not need is a latent bug.
- Hardcoded default values (`projectId = 1`) are a form of technical debt that hides bugs. Null guards forcing explicit handling are better than silent fallbacks.
- Console.log in production code is a UX anti-pattern. Errors that are logged but not shown to users will be reported as "the sync button does nothing" support tickets.
- Deployment coordination: schema migrations that require production credentials cannot be tested locally. This needs a clear deployment checklist item.

## Next Steps

- [x] All CORS origins now use env vars
- [x] Project context wired up for all dashboard pages
- [x] Days parameter bounds enforced
- [ ] Verify `lastSyncedAt` migration runs successfully on Render
- [ ] Verify all OAuth integrations still work after redirect URI removal (token refresh, GSC fetch, GA4 fetch)

## Tests

27/28 passing. Pre-existing test isolation issue in `tasks.test.ts` remains unfixed — FK constraint failures due to PostgreSQL sequence not resetting between test file runs. Different test fails on each run depending on seed state.
