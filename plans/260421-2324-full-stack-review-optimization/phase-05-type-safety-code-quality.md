# Phase 5 — Type Safety & Code Quality

**Priority:** P2 | **Effort:** ~2h | **Status:** ✅ Done  
**Depends on:** Phase 2 (backend schemas), Phase 4 (frontend refactor)

## Context Links
- Plan: [plan.md](./plan.md)
- Research: [researcher-02-frontend-architecture.md](./research/researcher-02-frontend-architecture.md)
- Shared types: `packages/types/`
- API utils: `apps/api/src/utils/`

## Overview

Eliminate `any` types in Google API clients, consolidate shared types into `packages/types`, fix ESM/CJS mismatch in jobs, and ensure structured logging is used consistently across all API routes.

## Key Insights

- `GA4Client` and `GSCClient` use `private oauth2Client: any` — proper types exist in `googleapis-common`
- `packages/types/` is mostly unused — frontend and API define their own `Task`, `Project` types separately, risking drift
- `jobs/index.ts` uses `require()` inside function bodies in ESM context — could fail at runtime
- `apps/api/src/routes/projects.ts` still has `console.error` + `JSON.stringify(error)` debug blocks
- `tasks/page.tsx` uses `console.error` in catch — should be silent or use a logger
- Cron only starts in `production` mode — no `ENABLE_CRON` flag for local testing

## Requirements

- No `any` in `GA4Client` or `GSCClient` class fields
- `packages/types/` exports canonical `Task`, `Project`, `GscData`, `Ga4Data` — used by both API and frontend
- `jobs/index.ts` uses only ES imports, no `require()`
- All `console.*` calls in production route files replaced with logger
- `ENABLE_CRON=true` env flag allows cron in non-production

## Architecture

### Typed Google API Clients

```ts
// In ga4.ts
import type { OAuth2Client } from 'google-auth-library';
import type { analyticsdata_v1beta } from 'googleapis';

class GA4Client {
  private oauth2Client: OAuth2Client;
  private analyticsdata: analyticsdata_v1beta.Analyticsdata;
  // ...
}
```

```ts
// In gsc.ts
import type { OAuth2Client } from 'google-auth-library';
import type { searchconsole_v1 } from 'googleapis';

class GSCClient {
  private oauth2Client: OAuth2Client;
  private searchconsole: searchconsole_v1.Searchconsole;
  // ...
}
```

### Shared Types Strategy

```ts
// packages/types/src/index.ts — single export point
export type { Task, NewTask } from './task';
export type { Project, NewProject } from './project';
export type { GscDataRow } from './gsc-data';
export type { Ga4DataRow } from './ga4-data';
export type { ApiResponse, PaginatedResponse } from './api';
```

```ts
// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
```

Frontend imports: `import type { Task } from '@repo/types'`  
API routes import: `import type { Task } from '@repo/types'`

### Fix jobs/index.ts

```ts
// Before (broken ESM):
export function startAllSyncJobs() {
  const { startGSCSyncJob } = require('./sync-gsc'); // ← wrong
}

// After (correct ESM):
import { startGSCSyncJob } from './sync-gsc';
import { startGA4SyncJob } from './sync-ga4';
import { logger } from '../utils/logger';
const log = logger.child('Jobs');

export function startAllSyncJobs() {
  startGSCSyncJob();
  startGA4SyncJob();
  log.info('All sync jobs started');
}
```

### ENABLE_CRON Flag

```ts
// apps/api/src/index.ts
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  startAllSyncJobs();
}
```

## Related Code Files

**Modify:**
- `apps/api/src/routes/integrations/ga4.ts` — type `GA4Client` fields
- `apps/api/src/routes/integrations/gsc.ts` — type `GSCClient` fields
- `apps/api/src/jobs/index.ts` — remove `require()`, use ES imports
- `apps/api/src/index.ts` — add `ENABLE_CRON` flag
- `apps/api/src/routes/projects.ts` — remove remaining `console.error` debug blocks
- `apps/web/src/app/dashboard/tasks/page.tsx` — replace `console.error` with silent catch

**Expand:**
- `packages/types/src/index.ts` — add `ApiResponse<T>`, `PaginatedResponse<T>`, canonical entity types
- `packages/types/package.json` — ensure exports field is set

**Update:**
- `apps/web/src/hooks/*.ts` — import types from `@repo/types` instead of local `src/types/`

## Implementation Steps

1. Expand `packages/types/src/index.ts` — add `ApiResponse`, `PaginatedResponse`, entity types
2. Type `GA4Client` fields in `ga4.ts` — import `OAuth2Client` from `google-auth-library`
3. Type `GSCClient` fields in `gsc.ts` — import `OAuth2Client` from `google-auth-library`
4. Fix `jobs/index.ts` — replace `require()` with top-level ES imports
5. Add `ENABLE_CRON` flag in `apps/api/src/index.ts`
6. Clean `projects.ts` — remove all remaining `console.error`/`JSON.stringify` debug blocks
7. Clean `tasks/page.tsx` — remove `console.error` in catch
8. Update frontend hooks to import from `@repo/types`
9. Run `npm run type-check` across all packages
10. Confirm no `any` in `ga4.ts` / `gsc.ts` after changes

## Todo

- [x] Add `ApiResponse<T>` and `PaginatedResponse<T>` to `packages/types`
- [x] Add canonical `Task`, `Project` types to `packages/types`
- [x] Type `oauth2Client` in `GA4Client` (remove `any`)
- [x] Type `analyticsdata` in `GA4Client` (remove `any`)
- [x] Type `oauth2Client` in `GSCClient` (remove `any`)
- [x] Type `searchconsole` in `GSCClient` (remove `any`)
- [x] Fix `jobs/index.ts` — remove `require()` calls
- [x] Add `ENABLE_CRON` env flag to cron startup logic
- [x] Add `ENABLE_CRON=false` to `.env.example`
- [x] Remove `console.error` debug blocks from `projects.ts`
- [x] Update frontend hooks to use `@repo/types`
- [x] Run `npm run type-check` — zero errors

## Success Criteria

- `tsc --noEmit` passes with zero errors across all packages
- No `any` in `GA4Client` or `GSCClient` class bodies
- `ENABLE_CRON=true npm run dev` starts cron jobs locally
- `jobs/index.ts` has zero `require()` calls
- Frontend `Task` type and API `Task` type are the same import from `@repo/types`

## Risk Assessment

- `googleapis` types may not exactly match runtime shape — runtime tests needed after typing
- Shared types in `packages/types` may conflict with existing local type names — rename with `type` aliases during migration

## Security Considerations

- Typed clients reduce surface area for accidental data exposure via loosely-typed `any` fields
