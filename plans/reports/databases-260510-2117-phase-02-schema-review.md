---
title: Phase-02 Schema Redesign — Database Review Report
date: 2026-05-10
type: review
scope: phase-02-schema-redesign.md validation against PostgreSQL/Drizzle best practices
reviewer: databases skill
verdict: NEEDS_REVISION (6 critical, 6 warnings, 4 info)
---

# Phase-02 Schema Redesign — Database Review Report

## Executive Summary

Phase-02 plan is **structurally sound** in concept (workspace scoping, connection table consolidation, new goal/sprint/alert tables) but has **6 critical issues** that would cause runtime errors or data bugs if implemented as-is. Must fix before executing `db:push`.

---

## Critical Issues

### C1 — ID Type: Serial vs UUID (Type Mismatch with Better Auth)

**Severity:** CRITICAL — will break FK references at runtime

Phase-02 doesn't specify ID types. V1 uses `serial` (int4). Better Auth generates `text` UUIDs for `user.id` and `organization.id`. If business tables use `serial` but reference Better Auth's `text` fields, FK type mismatch causes PostgreSQL errors.

**Impact:** `tasks.assigneeId`, `tasks.reporterId`, `goals.createdByUserId`, `time_logs.userId`, `projects.workspaceId`, ALL connection tables → all reference Better Auth IDs.

**Fix:** Use `uuid` primary keys for all new v2 tables. Use `text` for FK references to Better Auth tables (since Better Auth stores UUIDs as text).

```ts
// ✅ Correct — Drizzle ORM v2 pattern
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),      // gen_random_uuid()
  workspaceId: text('workspace_id').notNull(),       // refs Better Auth org.id (text UUID)
  // ...
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id'),                   // refs Better Auth user.id (text)
  reporterId: text('reporter_id').notNull(),         // refs Better Auth user.id (text)
  // ...
});
```

---

### C2 — workspaceId on Analytics Tables: Unnecessary Denormalization

**Severity:** CRITICAL (design flaw) — storage waste + update anomaly risk on large tables

Plan adds `workspaceId` to `gsc_data` and `ga4_data`. These tables can contain **millions of rows** (1 row per page/query/date combination per project). Adding `workspaceId` here:
- Wastes storage (~8 bytes × millions of rows)
- Creates update anomaly if project is moved between workspaces
- Provides zero query benefit: `projectId` already scopes data; workspace queries JOIN through `projects`

**Fix:** Remove `workspaceId` from `gsc_data` and `ga4_data`. Keep on business logic tables (tasks, goals, sprints, alerts) where direct workspace queries are common.

```ts
// ❌ Phase-02 plan (unnecessary on large tables)
export const gscData = pgTable('gsc_data', {
  workspaceId: text('workspace_id').notNull(),  // REMOVE THIS
  projectId: uuid('project_id').notNull(),
  // ...
});

// ✅ Correct — workspace resolved via JOIN
// SELECT gsc.* FROM gsc_data gsc
// JOIN projects p ON gsc.project_id = p.id
// WHERE p.workspace_id = $workspaceId
```

---

### C3 — ga4_data: bounceRate Naming — GA4 Regression

**Severity:** CRITICAL — data mapping error, metric will always be NULL/0

V1 correctly uses `engagementRate` (GA4 deprecated `bounceRate` in 2020, replaced with `engagementRate`). Phase-02 plan changes to `bounceRate`. GA4 API returns `engagementRate` via `analytics_data` field, not `bounceRate`. This will break sync job mapping.

Additionally, plan removes `conversionRate`, `source`, `medium`, `deviceCategory` from `ga4_data` — these are heavily used in analytics dashboards.

**Fix:** Keep `engagementRate`, add back `conversionRate`. Source/medium/deviceCategory should be kept or explicitly decided in phase-06.

```ts
// ✅ Correct ga4_data schema
export const ga4Data = pgTable('ga4_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  sessions: integer('sessions').notNull().default(0),
  users: integer('users').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 4 }).notNull().default('0'),  // NOT bounceRate
  averageSessionDuration: numeric('average_session_duration', { precision: 10, scale: 2 }).notNull().default('0'),
  conversions: integer('conversions').notNull().default(0),
  conversionRate: numeric('conversion_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  revenue: numeric('revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  source: varchar('source', { length: 255 }).notNull().default('(direct)'),
  medium: varchar('medium', { length: 100 }).notNull().default('(none)'),
  deviceCategory: varchar('device_category', { length: 50 }).notNull().default('desktop'),
}, (t) => ({
  uniqueEntry: uniqueIndex('ga4_data_unique_idx').on(t.projectId, t.date, t.source, t.medium, t.deviceCategory),
  projectDateIdx: index('ga4_data_project_date_idx').on(t.projectId, t.date),
}));
```

---

### C4 — gsc_connections / ga4_connections: Missing authorizedByUserId

**Severity:** CRITICAL — multi-user audit trail broken

Plan consolidates `oauth_tokens + gsc_sites → gsc_connections` but omits WHO authorized the OAuth. In multi-user workspace:
- Multiple users can attempt to connect GSC
- Need to know which user's Google account is linked
- Needed for re-auth flows ("Your GSC connection by alice@ expired")

**Fix:** Add `authorizedByUserId` (text, refs Better Auth user.id).

```ts
export const gscConnections = pgTable('gsc_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(), // ← ADD THIS
  accountEmail: varchar('account_email', { length: 255 }),     // ← ADD THIS (which Google account)
  siteUrl: varchar('site_url', { length: 500 }).notNull(),
  permissionLevel: varchar('permission_level', { length: 50 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('idle'), // 'idle'|'syncing'|'error'
  syncError: text('sync_error'),  // ← ADD for error tracking
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  projectIdx: index('gsc_conn_project_idx').on(t.projectId),
  workspaceIdx: index('gsc_conn_workspace_idx').on(t.workspaceId),
  // One active connection per project (enforce via unique or app logic)
}));
```

---

### C5 — tasks v2: Unit Inconsistency (seconds vs minutes)

**Severity:** CRITICAL — causes silent arithmetic bugs in time tracking UI

- `timeSpent`: integer (seconds) → inherited from v1
- `estimatedMinutes`: integer (minutes) → new field name

Mixing units causes bugs: `progress = timeSpent / (estimatedMinutes * 60)` — easy to forget the conversion, causes off-by-60x errors in progress bars.

**Fix:** Standardize to seconds for all time fields (seconds are more precise for timers). Rename consistently.

```ts
// ✅ Consistent — all time in seconds
estimatedTime: integer('estimated_time'),    // seconds (rename from estimatedMinutes)
timeSpent: integer('time_spent').notNull().default(0),  // seconds (keep)

// In API layer, convert to minutes/hours for display only
```

---

### C6 — alerts: No Per-User Read Tracking

**Severity:** CRITICAL for multi-user — User A reading alert marks it read for User B too

`isRead: boolean` is a single field. In multi-user workspace, each user needs independent read state.

**Fix:** Two options:

**Option A (Simple — recommended for MVP):** Add `dismissedAt` + separate `alert_reads` join table.

```ts
// alerts table (keep as-is but remove isRead/readAt)
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id'),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('info'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  workspaceCreatedIdx: index('alerts_workspace_created_idx').on(t.workspaceId, t.createdAt),
  workspaceTypeIdx: index('alerts_workspace_type_idx').on(t.workspaceId, t.type),
}));

// Separate read tracking
export const alertReads = pgTable('alert_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),  // refs Better Auth user.id
  readAt: timestamp('read_at').notNull().defaultNow(),
}, (t) => ({
  alertUserUnique: uniqueIndex('alert_reads_alert_user_unique').on(t.alertId, t.userId),
  userIdx: index('alert_reads_user_idx').on(t.userId),
}));
```

**Option B (Simpler but less flexible):** Keep `isRead` + add `readByUserIds: text[]` for tracking.

---

## Warning Issues

### W1 — goals.currentValue: Derived Data Should Not Be Stored

`currentValue` changes every time GSC/GA4 syncs. Storing it means:
- Background job needed to keep it updated
- Stale data between syncs
- Extra write overhead on every sync

**Recommendation:** Remove `currentValue` from goals table. Compute via API JOIN query when displaying goal progress.

```ts
// ❌ Remove from goals table
currentValue: numeric('current_value'),

// ✅ Compute in API
const goalWithProgress = await db
  .select({ goal: goals, currentClicks: sql<number>`SUM(${gscData.clicks})` })
  .from(goals)
  .leftJoin(gscData, and(
    eq(gscData.projectId, goals.projectId),
    gte(gscData.date, goals.startDate),
    lte(gscData.date, goals.endDate)
  ))
  .where(eq(goals.id, goalId));
```

---

### W2 — sprints: Missing projectId

Sprints are tied to `workspaceId` + optional `goalId` but NO `projectId`. Users will expect project-scoped sprints (Sprint for website A, Sprint for website B). Without `projectId`, the sprint board view must show all workspace sprints together — not practical.

**Fix:** Add optional `projectId` to sprints.

```ts
export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }), // ← ADD
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  // ...
});
```

---

### W3 — tasks v2: Missing Critical Indexes

Plan defines schema but specifies ZERO indexes for tasks. Given tasks is the most queried table:

```ts
export const tasks = pgTable('tasks', { /* ... */ }, (t) => ({
  // Query: workspace board view (most common)
  workspaceStatusIdx: index('tasks_workspace_status_idx').on(t.workspaceId, t.status),
  
  // Query: sprint board view
  sprintIdx: index('tasks_sprint_idx').on(t.sprintId),
  
  // Query: goal progress tracking
  goalIdx: index('tasks_goal_idx').on(t.goalId),
  
  // Query: project board view
  projectStatusIdx: index('tasks_project_status_idx').on(t.projectId, t.status),
  
  // Query: workload visualization (who has what)
  assigneeWorkspaceIdx: index('tasks_assignee_workspace_idx').on(t.assigneeId, t.workspaceId),
  
  // Query: upcoming/overdue tasks
  dueDateIdx: index('tasks_due_date_idx').on(t.dueDate),
  
  // Query: recurring tasks for cron job
  isRecurringIdx: index('tasks_is_recurring_idx').on(t.isRecurring).where(sql`is_recurring = true`), // Partial index
  
  // CHECK constraints (enums)
  statusCheck: check('tasks_status_check', sql`${t.status} IN ('backlog','todo','in_progress','blocked','in_review','done')`),
  priorityCheck: check('tasks_priority_check', sql`${t.priority} IN ('low','medium','high','urgent')`),
}));
```

---

### W4 — gsc_data_aggregated: Not Mentioned in Phase-02

Phase-02 plan lists tables to drop/recreate but doesn't mention `gsc_data_aggregated`. This table:
- Is actively used by the sync job (`sync-gsc.ts`)
- Provides accurate dashboard totals (separate from dimensional `gsc_data`)
- Must be explicitly included in the new schema with `projectId` → UUID migration

**Fix:** Add to phase-02 todo list:
```ts
export const gscDataAggregated = pgTable('gsc_data_aggregated', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  siteUrl: text('site_url').notNull(),
  date: date('date').notNull(),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: numeric('ctr', { precision: 6, scale: 4 }).notNull().default('0'),    // Use numeric not text
  position: numeric('position', { precision: 5, scale: 2 }).notNull().default('0'),  // Use numeric not text
}, (t) => ({
  projectSiteDateUnique: uniqueIndex('gsc_agg_unique').on(t.projectId, t.siteUrl, t.date),
  projectDateIdx: index('gsc_agg_project_date_idx').on(t.projectId, t.date),
}));
```

---

### W5 — projects: Missing uniqueIndex on (workspaceId, domain)

A workspace should not have two projects with the same domain. Currently no unique constraint prevents this.

```ts
export const projects = pgTable('projects', { /* ... */ }, (t) => ({
  // Prevent duplicate domain within workspace
  workspaceDomainUnique: uniqueIndex('projects_workspace_domain_unique').on(t.workspaceId, t.domain),
  workspaceIdx: index('projects_workspace_idx').on(t.workspaceId),
}));
```

---

### W6 — gsc_connections/ga4_connections: Missing syncError Field

Phase-02 adds `syncStatus` but no `syncError` field. When sync fails, there's no way to store the error message for display in UI ("Last sync failed: Token expired"). The current `sync-gsc.ts` already tracks errors.

```ts
syncStatus: varchar('sync_status', { length: 20 }).notNull().default('idle'),
syncError: text('sync_error'),  // ← ADD — null when OK, error message when failed
```

---

## Info Items

### I1 — task_templates: recurringConfig JSONB Shape Undefined

Plan uses `recurringConfig: jsonb` without documenting the expected shape. Should define and document:

```ts
// Document in code or zod schema:
// recurringConfig shape:
// {
//   frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
//   dayOfWeek?: 0-6 (0=Sunday, for weekly),
//   dayOfMonth?: 1-31 (for monthly),
//   createDaysBefore?: number (create X days before due date),
// }
```

---

### I2 — time_logs: Column Rename from v1 (Migration Note)

V1 uses `startTime/endTime/notes`, v2 proposes `startedAt/endedAt/note`. Both are fine; just document in migration script to avoid confusion.

---

### I3 — goals: Missing Index on workspaceId + status

```ts
(t) => ({
  workspaceStatusIdx: index('goals_workspace_status_idx').on(t.workspaceId, t.status),
  projectIdx: index('goals_project_idx').on(t.projectId),
  createdByIdx: index('goals_created_by_idx').on(t.createdByUserId),
})
```

---

### I4 — Migration Safety: No Backup Script in Plan Steps

Step 1 says "Export/backup current production data (CSV)" but provides no specific queries. Add to implementation steps:

```bash
# Export existing tasks before drop
psql $DATABASE_URL -c "\COPY tasks TO '/tmp/tasks_backup.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY projects TO '/tmp/projects_backup.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY gsc_data TO '/tmp/gsc_data_backup.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY ga4_data TO '/tmp/ga4_data_backup.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY gsc_data_aggregated TO '/tmp/gsc_agg_backup.csv' CSV HEADER"
```

---

## Revised Implementation Checklist (additions to phase-02 todo)

```
CRITICAL FIXES (must do before db:push):
- [ ] Change all primary keys from serial → uuid (defaultRandom())
- [ ] Change workspaceId FK type to text (Better Auth compatibility)
- [ ] Remove workspaceId from gsc_data and ga4_data tables
- [ ] Revert ga4_data: bounceRate → engagementRate, restore conversionRate/source/medium/deviceCategory
- [ ] Add authorizedByUserId + accountEmail to gsc_connections and ga4_connections
- [ ] Rename estimatedMinutes → estimatedTime (seconds) in tasks
- [ ] Replace isRead/readAt in alerts with alert_reads join table

WARNING FIXES (strongly recommended):
- [ ] Remove currentValue from goals (compute via API)
- [ ] Add projectId to sprints table
- [ ] Add indexes to tasks table (at minimum: workspaceStatus, sprint, goal, assigneeWorkspace)
- [ ] Add gsc_data_aggregated to new schema spec
- [ ] Add uniqueIndex (workspaceId, domain) to projects
- [ ] Add syncError text field to gsc_connections and ga4_connections

INFO (nice to have):
- [ ] Document recurringConfig JSONB shape in code/types
- [ ] Note column renames (time_logs) in migration comments
- [ ] Add index (workspaceId, status) to goals
- [ ] Add backup SQL commands to implementation step 1
```

---

## Final Verdict

| Area | Status |
|------|--------|
| Overall architecture | ✅ Sound — workspace model, connection table consolidation, new tables all make sense |
| ID type strategy | ❌ Critical — must switch to UUID before implementation |
| Analytics table design | ⚠️ 2 regressions (ga4 metric rename, unnecessary denorm) |
| Connection tables | ⚠️ Missing audit fields, error tracking |
| Task management schema | ⚠️ Unit inconsistency, missing indexes |
| Goals/sprints/alerts | ⚠️ Derived data issue, missing projectId, multi-user read tracking |
| Migration plan | ⚠️ No backup commands specified |

**Phase-02 is NOT ready to implement as written.** Fix the 6 critical issues first. The 6 warnings should ideally be fixed in the same pass since they require schema changes.

Estimated additional effort to fix: **+2h** (most fixes are additive/renaming, no architecture rethink needed).

---

## Unresolved Questions

1. **Better Auth organization.id type**: Confirm exact column type in Better Auth's `organization` table — is it `text` (UUID string) or native `uuid`? Affects FK declaration.
2. **gsc_data_aggregated fate**: Keep as separate table (current pattern) or merge into `gsc_data` with a `is_aggregated` flag? Current 2-table pattern is cleaner for sync logic.
3. **alert_reads table**: MVP-level — is per-user read tracking needed in v2 launch, or ship with workspace-level `isRead` first and iterate?
4. **goals.currentValue**: If removed from schema, which phase implements the computation logic (Phase 06 Analytics Intelligence)? Should be explicitly stated in phase dependencies.
5. **projects.color field**: Added in v2 spec, not in v1 — confirm supported palette (hex string? predefined enum?). Recommend `varchar(7)` for hex.
