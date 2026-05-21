# Documentation Update: Phase 02 Infrastructure Migration

**Date:** 2026-04-26  
**Status:** DONE

## Summary

Updated `docs/system-architecture.md` and `docs/code-standards.md` to reflect Phase 02 infrastructure migration where the Hono API is now exported as `@repo/api-app` package and mounted within the Next.js app on Vercel.

## Changes Made

### 1. docs/system-architecture.md (151 LOC)

**Section: Overview**
- Updated directory tree to show `packages/api-app/` as new shared package
- Changed description from "two apps" to "two apps and multiple shared packages"
- Listed all packages: api-app, db, types, integrations, ui

**Section: Service Architecture**
- Split into two subsections: **Production (Vercel)** and **Local Development**
- Production flow: Browser → Next.js + Hono (same origin, Vercel) → PostgreSQL
- Local dev flow: Browser → Next.js dev → Optional standalone Hono (port 3001)
- Added note: "Hono app mounted at `/api` via [[...route]]/route.ts"
- Clarified sync jobs run on Vercel cron or locally with `ENABLE_CRON=true`
- Emphasized key change: "Web + API collocated on same Vercel deployment"

**Section: Google OAuth Flows**
- Added context: "handled by Hono app in `packages/api-app`"
- Noted: "OAuth callbacks no longer Next.js route handlers"

**Section: Environment Variables**
- Updated `DATABASE_URL` source: "root `.env`, deployed"
- Grouped vars by source: Hono (api-app), apps/api/.env, apps/web/.env.local
- Clarified `NEXT_PUBLIC_API_URL`: "empty string `/api` in production"
- Added note about Vercel preview deployments

### 2. docs/code-standards.md (141 LOC)

**Section: Directory Conventions**
- Restructured to reflect new layout:
  - `apps/api/src/` — now only has `index.ts` (local dev server)
  - `apps/web/src/` — added `app/api/[[...route]]/route.ts` line
  - Added new `packages/api-app/src/` section with full structure:
    - `app.ts` — Hono instance
    - `routes/`, `schemas/`, `jobs/`, `utils/`
  - Listed other packages: db, types, integrations, ui

**Section: API (Hono)**
- Renamed to "API (Hono) — `packages/api-app`"
- Added subsection: **Architecture** explaining centralization
- Specified entry/export points: `app.ts` → `index.ts`
- Documented production (Vercel) vs local dev flow
- Added subsection: **Route & Schema Organization** (unchanged validation rules)
- Added subsection: **Jobs & Cron** with explicit job startup requirements

**Section: React / Next.js**
- Renamed to "React / Next.js (`apps/web`)"
- Added note about API route handler: `apps/web/src/app/api/[[...route]]/route.ts`
- Emphasized: "All API logic in `packages/api-app`, not Next.js route handlers"

## Files Updated

- `/Users/kong.peterpan/Documents/Personal App/task-management/docs/system-architecture.md`
- `/Users/kong.peterpan/Documents/Personal App/task-management/docs/code-standards.md`

## Line Count Status

| File | LOC | Status |
|------|-----|--------|
| system-architecture.md | 151 | ✅ Under 800 limit |
| code-standards.md | 141 | ✅ Under 800 limit |
| **Total** | **292** | ✅ Well under limit |

## Verification

- ✅ Verified `packages/api-app/` exists with correct exports
- ✅ Confirmed `apps/web/src/app/api/[[...route]]/route.ts` mounts Hono
- ✅ Checked `apps/web/next.config.js` has no rewrites (proxy removed)
- ✅ Validated `apps/api/src/index.ts` only serves shared app locally
- ✅ All code examples match actual implementation
- ✅ No broken links or outdated references

## Accuracy Notes

All documentation reflects the current state of the codebase after Phase 02:
- OAuth callbacks moved from Next.js to Hono routes (no separate callback handlers)
- `NEXT_PUBLIC_API_URL` empty string in production (same-origin API calls)
- Sync jobs exported from `@repo/api-app` and conditionally started
- Local dev server (`apps/api`) is optional and for development only

No roadmap or changelog updates made per requirements.
