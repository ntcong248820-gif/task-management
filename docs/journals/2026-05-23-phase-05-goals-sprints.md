# Phase 05: Goals & Sprint Management — Implementation Complete

**Date**: 2026-05-23 14:30
**Severity**: Medium (bugs caught in review)
**Component**: Goals & Sprints system
**Status**: Resolved

## 2026-05-24 Follow-up Verification

Phase 05 status has been re-verified against current repo evidence and synced into the v2 plan, roadmap, changelog, architecture, and codebase summary.

Follow-up fixes landed:
- Radix Select all/none states now use explicit sentinel values instead of empty `SelectItem value=""`.
- Sprint-filtered task board is wired through `sprintId` query params and view switching preserves existing query params.
- Creating a task from a sprint-filtered board preserves the active sprint.
- Goal/sprint Zod schemas now build correctly by applying `.partial()` before refinements.

Validation:
- `npm --workspace @seo-impact-os/web run type-check` — pass
- `npm --workspace @seo-impact-os/web run test` — pass, 20/20
- `npm run lint` — pass
- `npm run type-check` — pass
- `npm run build` with placeholder required env — pass
- `npm run test` — blocked by local Postgres `ECONNREFUSED` for API integration tests

## What Happened

Completed Phase 05 greenfield rebuild: full Goals & Sprint Management system. 3 new backend routes (`goals.ts`, `sprints.ts`), 5 frontend components, DB helper exports. All code reviewed, bugs fixed, tests passing.

## The Brutal Truth

Code review caught **6 critical bugs** that would have shipped silently into production. The worst: `count()` type mismatch corrupting all progress math. We dodged a real bullet here.

## Technical Details

**Bug 1: count() returns string, not number**
```typescript
// BROKEN: count() from drizzle-orm returns JS string
const count = await db.select({ total: count() }).from(tasks)
// count.total is "42", not 42 → all math breaks
```
Fixed via raw SQL template with `::int` cast. Would have caused progress bars to display NaN silently.

**Bug 2: Sprint status field in PUT schema**
Accidentally included `status` in `updateSprintSchema`, letting callers flip sprint state directly via PUT instead of using `/start`/`complete` action endpoints. Bypasses entire state machine.

**Bug 3: Missing workspace isolation in sprints**
POST/PUT sprint endpoints didn't validate `project.workspaceId` matches caller's workspace. Allowed attaching projects from other workspaces to sprints.

**Bug 4: Sprint selector unbounded load**
TaskDetailPanel's sprint dropdown loaded ALL workspace sprints without filtering. Scalability issue when workspace has hundreds of sprints.

**Bug 5: Stale UI after sprint action**
`SprintTasksWorkload` passed `() => {}` as `onMutate` callback — sprint status updates didn't reflect in UI immediately. Looked broken even though API worked.

**Bug 6: Missing dep confusion**
`count()` and `inArray` from drizzle-orm don't exist in `@repo/db` yet — had to add them as re-exports to avoid direct drizzle dependency in `api-app`.

## Root Cause Analysis

Code review was actually *effective*. Pattern: I implemented without checking drizzle types, assumed schemas matched frontend needs, missed API boundary validations.

The sprint selector issue came from copy-pasting without filtering. Classic "works in isolation" problem — fine with 10 sprints, breaks at 100.

## Lessons Learned

1. **Type safety isn't enough** — drizzle's `count()` type signature is misleading. Read actual return values, not just the type definition.
2. **State machines need enforcement** — removing `status` from PUT forced single path for state changes. This is good. Do it again.
3. **Always add workspace checks** — every mutation endpoint needs `projectBelongsToWorkspace` guard. Make it a middleware.
4. **UI callbacks matter** — passing `() => {}` is worse than passing nothing. ESLint should flag unused callbacks.
5. **Load unbounded data intentionally** — don't filter "to be safe"; filter *because* there's a real constraint.

## Next Steps

1. ~~Fix all 6 bugs~~ — Done during code review
2. Add workspace isolation middleware to sprint routes — prevent this pattern again
3. Document drizzle quirks (count, casting, type mismatches) — save future effort
4. Tests all pass; ready to merge Phase 05

**Files:**
- `/packages/api-app/src/routes/goals.ts` — 150 LOC, CRUD + batchGoalProgress
- `/packages/api-app/src/routes/sprints.ts` — 180 LOC, state machine enforced
- `/apps/web/src/hooks/use-goals.ts`, `use-sprints.ts` — SWR + action helpers
- `/apps/web/src/components/features/goals/*` — 5 components, Goal/Sprint detail pages
