---
name: Type Check Path Alias Resolution Failure
description: apps/web path aliases (@/) not resolving during turbo type-check; pre-existing, not Phase 02-related
type: project
---

## Issue

`npm run type-check` fails on `apps/web` with 100+ errors like:
```
error TS2307: Cannot find module '@/components/ui/card'
error TS2307: Cannot find module '@/hooks'
error TS2307: Cannot find module '@/lib/api-client'
```

## Root Cause

`apps/web/tsconfig.json` path aliases configured but not resolving when turbo runs `tsc --noEmit` from workspace root.

Next.js dev/build works fine (Next.js resolves aliases), but TypeScript during type-check doesn't.

## Impact

- **Type Safety:** Compromised for web app during CI/CD type-check
- **Runtime:** Not affected (Next.js handles it)
- **Severity:** Medium (hidden type errors possible)

## Status

Pre-existing, not caused by Phase 02 migration. Scheduled for Phase 05 (type safety + code quality).

## Fix Location

`apps/web/tsconfig.json` — Verify baseUrl and paths configuration, likely needs to account for workspace root context when run from monorepo root.
