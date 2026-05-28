---
name: Phase 02 Migration Test Structure
description: Test approach for Hono/Next.js infra migration; database-level tests transparent to mounting changes
type: project
---

## Migration Structure

**Created:** `packages/api-app/` workspace containing full Hono app (routes, jobs, schemas, utils)

**Modified:** 
- `apps/api/src/index.ts` — imports from `@repo/api-app`
- `apps/web/src/app/api/[[...route]]/route.ts` — mounts Hono via `handle(app)`

**Test Impact:** Database-level tests (in `apps/api/src/routes/__tests__/`) use direct DB imports, so migration is transparent to them. No test code changes needed.

## Test Coverage Status

**Passing:** 38 tests across 6 files (4 in apps/api, 2 in apps/web)

**Test Types:**
- Database operations: task/project CRUD, status validation ✅
- Utilities: crypto-tokens (100% coverage), logger (89% coverage) ✅
- UI components: Button, KPI card (good coverage) ✅

**Critical Gaps:**
1. **HTTP/route handler tests** — Routes exist but no request/response tests. Database tests pass but don't exercise Hono handlers.
2. **OAuth flows** — GA4/GSC integration untested (external APIs)
3. **Next.js integration** — Hono mounting via `route.ts` not tested

**Why:** Route tests were database-focused (intentional design). Migration doesn't break them, but new HTTP-level tests needed to validate Hono mounting in Next.js context.

## Future Test Additions

Priority for Phase 02 completion:
1. Add request/response tests for all 9 routes (use supertest against Hono app directly or Next.js endpoint)
2. Test HTTP methods forwarding in `apps/web/src/app/api/[[...route]]/route.ts`
3. Mock OAuth flows for integrations (nock or similar)

**Why important:** Database tests don't exercise Hono's request parsing, validation, or error handling layers. Need HTTP-level tests to catch request mapping issues.
