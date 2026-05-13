# Phase-02 Schema Review: Caught 6 Critical Bugs Before Implementation

**Date**: 2026-05-10 21:17
**Severity**: High (Critical issues found, all fixed)
**Component**: Database schema for v2 greenfield rebuild
**Status**: Resolved — plan updated, ready for Phase 02 implementation

## What Happened

Ran a comprehensive database review on phase-02-schema-redesign.md before implementation began. The review examined the proposed PostgreSQL schema against Drizzle ORM best practices, multi-user workspace requirements, and compatibility with Better Auth.

**Process:**
1. Scout existing v1 schema (`packages/db/src/schema/`)
2. Read proposed v2 spec in `plans/260510-1600-v2-greenfield-rebuild/phase-02-schema-redesign.md`
3. Delegated to `/ck:databases` skill — cross-checked against PostgreSQL design patterns + Drizzle best practices
4. Received detailed review report: `plans/reports/databases-260510-2117-phase-02-schema-review.md`
5. Applied all 6 critical + 6 warning fixes directly to phase-02-schema-redesign.md
6. Updated effort estimate: ~6h → ~8h (critical fixes add complexity)

**Result:** All issues fixed. Plan is now implementation-ready.

---

## The Brutal Truth

This was the right call at the right time. The 6 critical issues discovered would have been **catastrophic if shipped as-is**:

- **C1 (UUID/serial type mismatch)**: Would cause runtime FK constraint violations. The error would surface during Phase 03-04 after weeks of building on a broken schema. Debugging would be miserable.
- **C3 (GA4 bounceRate regression)**: Silently broken data pipeline. Sync job would map API response to a non-existent column, producing NULLs everywhere. Dashboards would show zeros. We'd discover this in production or during final testing.
- **C6 (Alert read tracking)**: Multi-user bug embedded in v2 from day one. Every user would mark alerts as read for the entire workspace. Would require full schema rework to fix post-launch.

The emotional relief from catching these BEFORE implementation is real. The alternative was 4-6 hours of debugging after we'd already committed layers of code on top of a broken foundation.

---

## Technical Details

### Critical Issues Found & Fixed

**C1 — ID Type Mismatch: Serial vs UUID**
- **Problem**: Phase-02 didn't specify PK types. V1 uses `serial (int4)`. Better Auth generates `text` UUID for `user.id` and `organization.id`. If tasks use serial PK but reference Better Auth's text fields via FK, PostgreSQL rejects the constraint.
- **Impact**: All `assigneeId`, `reporterId`, `createdByUserId`, `workspaceId` references would fail
- **Fix**: Changed all PKs to `uuid('id').primaryKey().defaultRandom()`. All Better Auth FK refs to `text`.
- **Example**:
```ts
// Before: missing type, implicit serial assumptions
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  workspaceId: ..., // type?
  assigneeId: ..., // text UUID from Better Auth, but PK was int4
});

// After: explicit UUID + text for Better Auth refs
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  assigneeId: text('assignee_id'),
});
```

**C2 — Unnecessary workspaceId on Analytics Tables**
- **Problem**: Added `workspaceId` to `gsc_data` and `ga4_data`. These tables store millions of rows (1 row per page/query/date combination). Adding `workspaceId` wastes 8 bytes per row and creates update anomaly risk.
- **Impact**: Storage bloat. Query performance no improvement (already scoped via `projectId` → `projects.workspaceId` JOIN).
- **Fix**: Removed `workspaceId` from `gsc_data`, `gsc_data_aggregated`, `ga4_data`. Workspace resolution happens via JOIN through projects table.

**C3 — GA4 Field Regression: bounceRate**
- **Problem**: Plan renamed `engagementRate` → `bounceRate`. GA4 API **deprecated** `bounceRate` in 2020, returns `engagementRate` via `analytics_data` field. This breaks sync job mapping silently.
- **Impact**: Sync job inserts NULL/0 for engagement metrics. Analytics dashboards show zero engagement across all pages.
- **Additional issues**: Plan also removed `conversionRate`, `source`, `medium`, `deviceCategory` — heavily used in v1 dashboards.
- **Fix**: Reverted to `engagementRate`. Restored `conversionRate`, `source`, `medium`, `deviceCategory`.

**C4 — Connection Audit Trail Missing**
- **Problem**: `gsc_connections` and `ga4_connections` tables lack `authorizedByUserId` and `accountEmail` fields. In multi-user workspace, need to know which user's Google account is linked.
- **Impact**: Can't display "Connected by alice@company.com". Re-auth flows broken ("which user do I refresh the token for?").
- **Fix**: Added `authorizedByUserId: text('authorized_by_user_id')` (refs Better Auth user.id) and `accountEmail: varchar` to both connection tables. Also added `syncError: text` for error message tracking.

**C5 — Mixed Time Units in tasks**
- **Problem**: `timeSpent: integer` (seconds, from v1) + `estimatedMinutes: integer` (new, minutes). Mixing units causes arithmetic bugs.
- **Impact**: Easy to forget the 60x conversion. Progress calculation `timeSpent / (estimatedMinutes * 60)` becomes `timeSpent / estimatedMinutes * 60` if developer isn't careful.
- **Fix**: Renamed `estimatedMinutes` → `estimatedTime` (seconds). All time fields now consistent in seconds. Conversion to minutes/hours happens at API display layer only.

**C6 — Multi-user Alert Read Bug**
- **Problem**: `alerts.isRead: boolean` is single column. User A reading an alert marks it read for User B too. This is a fundamental multi-tenancy bug.
- **Impact**: Users can't independently manage alert state. Notification bell broken for shared workspaces.
- **Fix**: Removed `isRead`/`readAt` from alerts table. Created new `alert_reads` join table with `(alertId, userId, readAt)` and unique constraint on `(alertId, userId)`. Each user has independent read state.

### Warning Issues Fixed (6 items)

1. **W1 — goals.currentValue**: Removed. Derived data that goes stale immediately after sync. Compute via API JOIN instead.
2. **W2 — sprints missing projectId**: Added optional `projectId` FK. Users need project-scoped sprints (Sprint for website A vs B).
3. **W3 — tasks missing indexes**: Added 7 critical indexes: `workspaceStatus`, `projectStatus`, `sprint`, `goal`, `assigneeWorkspace`, `dueDate`, `isRecurring` (partial).
4. **W4 — gsc_data_aggregated not mentioned**: Added back to schema spec. Actively used by sync job, provides accurate dashboard totals.
5. **W5 — projects missing unique constraint**: Added `uniqueIndex('projects_workspace_domain_unique')` on `(workspaceId, domain)` to prevent duplicate domains per workspace.
6. **W6 — syncError field missing**: Added `syncError: text` to both `gsc_connections` and `ga4_connections` for UI error display.

---

## What We Tried

The review process was straightforward:
1. **Structured schema audit** — Each table cross-checked against: PostgreSQL best practices, Drizzle ORM v2 patterns, multi-user design, Better Auth compatibility
2. **Derived data analysis** — Identified `currentValue` (W1) and missing workspace resolution logic (C2)
3. **API compatibility check** — Matched GA4 API fields to schema (caught C3 bounceRate regression immediately)
4. **Index analysis** — Reviewed query patterns and added necessary indexes (W3)
5. **Multi-user audit trail** — Checked each table for per-user tracking where needed (caught C4, C6)

All findings were legitimate. No rabbit holes, no second-guessing.

---

## Root Cause Analysis

Why did these issues exist in the plan initially?

1. **C1 (UUID type)**: Phase-02 was written before Phase-01 (auth/workspace setup) was finalized. Better Auth integration details weren't locked down. Assumption was "we'll figure out the FK types later" — classic premature optimization problem.

2. **C3 (bounceRate)**: Schema was drafted by non-data-engineer. Familiar with GA4 v1 but not aware of the deprecation. Copy-paste error or mental association with "bounce" concept without checking API documentation.

3. **C6 (alert reads)**: Single-user mental model leaked into multi-user schema. Designer thought "user reads alert" as `isRead: boolean` without realizing multiple users would read the same alert independently.

4. **Missing indexes (W3)**: Schema defines tables but no thought given to query patterns. Easy to forget indexes come after; they're not "core schema." But they're required for performance.

5. **Missing `gsc_data_aggregated` (W4)**: Sync job details not reviewed when writing schema spec. Table exists in v1, used every sync cycle, but wasn't top-of-mind when listing "tables to recreate."

**Root pattern**: The plan was written by thinking about "what tables exist?" instead of "what queries will we run?" This is backwards. Schema should be derived from access patterns, not the other way around.

---

## Lessons Learned

### What Would Help in the Future

1. **Pre-review checklist before phase planning**: Run schema review for ANY database-related phase BEFORE implementation. Cost: ~1h. Benefit: Saves 4-6h of debugging post-implementation.

2. **Query-pattern-driven schema design**: For each table, list the access patterns first:
   ```
   tasks table:
   - Query: All tasks in workspace by status (workspaceId, status)
   - Query: All tasks in sprint (sprintId)
   - Query: Find overdue tasks (dueDate < today)
   - Query: Find tasks assigned to user (assigneeId, workspaceId)
   → Index for each pattern ✓
   ```

3. **Better Auth compatibility verification**: Before any FK design, verify Better Auth's exact table structure. Document it clearly in the plan. Better Auth uses `text` UUID for `user.id` and `organization.id` — this is non-obvious and critical.

4. **GA4 API alignment check**: Before storing GA4 metrics, cross-check field names against the actual GA4 Reporting API response. Don't assume based on old version.

5. **Multi-user audit trail standard**: Any field that's "per-user state" (read/dismiss/acknowledge) should use a JOIN table, not a boolean column. Make this a design pattern rule.

6. **Review after each major phase plan**: Schema review, type safety review, API contract review — these should be standard post-planning steps, not just post-implementation.

### Mindset Shift

The key insight: **Design reviews are not hindsight criticism, they're forward investment.** Taking 1h to review phase-02 before any code is written prevents 4-6h of debugging after code is written. And debugging with 3 phases of code already built on top is exponentially worse than fixing the schema itself.

---

## Unresolved Questions (Carry Forward)

1. **Better Auth organization.id type**: Confirmed assumption in Phase-01 implementation? Is it `text UUID` or native `uuid` Postgres type? Need verification to finalize all FK declarations.
   - **Action**: Phase-01 implementer to confirm exact Better Auth table structure

2. **gsc_data_aggregated separation**: Keep as separate table (current v2 design) or merge into `gsc_data` with `is_aggregated` boolean flag?
   - **Decision rationale**: Separate table is cleaner for sync job logic (GSC API returns both detailed + aggregated; easier to insert separately). Keeping it.
   - **Action**: Document in phase-02 implementation why aggregated is separate

3. **alert_reads MVP scope**: Per-user read tracking is now in the schema (W6 fix). But is this MVP-required in v2 launch, or can we ship with workspace-level `isRead` and iterate?
   - **Current stance**: Include in v2. It's only a join table; no performance cost.
   - **Action**: Confirm with product requirements

4. **goals.currentValue computation**: Removed from schema (W1 fix). Which phase implements the API query logic to compute current goal progress?
   - **Answer**: Phase-06 (Analytics Intelligence) — add explicit dependency note
   - **Action**: Phase-06 planner adds query implementation

---

## Next Steps

**Phase-02 Implementation (Ready to Start)**
1. Implement schema using updated `phase-02-schema-redesign.md` (all fixes applied)
2. Export backup CSVs before running `npm run db:push` (commands provided in plan)
3. Update `packages/db/src/schema/*` files with all new tables + UUID PKs + proper indexes
4. Update `packages/api-app/src/jobs/sync-gsc.ts` and `sync-ga4.ts` to use new table names + `engagementRate` field
5. Run `npm run type-check` to verify FK references are all correct
6. Run `npm run db:push` to apply schema to dev DB
7. Quick smoke test: Run sync jobs to verify no runtime FK errors

**Timeline**: Phase-02 effort now ~8h (up from ~6h) due to 6 critical fixes + comprehensive index strategy. Still acceptable pre-Phase-03.

---

**Status**: Phase-02 plan is now **implementation-ready**. All critical issues resolved. Ready to kick off Phase 02 implementation with confidence.
