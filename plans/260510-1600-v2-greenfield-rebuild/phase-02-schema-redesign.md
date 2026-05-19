---
phase: 2
title: "Data Schema Redesign"
status: completed
priority: P0
effort: "~8h"
dependencies: [1]
---

# Phase 02: Data Schema Redesign

## Overview

Reset và redesign toàn bộ business schema để support multi-user workspace model.
Giữ lại GSC/GA4 sync implementation knowledge nhưng adapt schema cho multi-user.

> **Updated:** Applied fixes từ database review (report: `plans/reports/databases-260510-2117-phase-02-schema-review.md`)
> Effort tăng từ ~6h → ~8h do 6 critical fixes cần thêm.
> **Production reconcile:** 2026-05-19 added `packages/db/migrations/0006_phase02_v2_schema_reconcile.sql`, applied v2 schema to production, preserved v1 business tables as `*_legacy_v1_20260519`, and verified authenticated `/api/projects` + `/api/tasks` return `200`.

## Strategy: Fresh Schema, Keep Sync Logic

- **Drop** và **recreate** tất cả business tables (projects, tasks, time_logs, gsc_data, etc.)
- **Adapt** không **rewrite** GSC/GA4 sync jobs — chỉ thay `projectId` references bằng references mới
- Better Auth tables (Phase 01) untouched — `workspaceId` là Better Auth's `organization.id` (type: `text`)
- Migration script để backup existing data trước khi drop

## Key Design Decisions (from Review)

| Decision | Rationale |
|----------|-----------|
| UUID primary keys (not serial) | Better Auth dùng `text` UUID — serial FK sẽ type mismatch ở runtime |
| `workspaceId` chỉ ở business tables, không ở analytics tables | `gsc_data`/`ga4_data` có thể millions rows, workspace resolved qua JOIN `projectId → projects.workspaceId` |
| `engagementRate` không phải `bounceRate` | GA4 API deprecated bounceRate từ 2020, trả về `engagementRate` |
| `alert_reads` join table thay vì `isRead boolean` | Multi-user: User A read ≠ User B read |
| `currentValue` không stored trong `goals` | Derived data — stale ngay sau sync, tính qua JOIN |
| `estimatedTime` (seconds) không phải `estimatedMinutes` | Nhất quán đơn vị với `timeSpent` (seconds) |

## New Schema Architecture

```
workspace (= organization từ Better Auth, id: text UUID)
  ├── projects[]              — SEO projects/websites
  │   ├── gsc_connections[]   — GSC OAuth token per project
  │   ├── ga4_connections[]   — GA4 OAuth token per project
  │   ├── gsc_data[]          — Raw GSC sync data (NO workspaceId)
  │   ├── gsc_data_aggregated[] — Date-level GSC totals (NO workspaceId)
  │   └── ga4_data[]          — GA4 metrics (NO workspaceId)
  ├── goals[]                 — Workspace-level goals (OKRs)
  │   └── sprints[]           — Time-boxed work periods (có projectId optional)
  ├── tasks[]                 — All tasks (link to project + goal + sprint)
  │   └── time_logs[]         — Time tracking entries (có userId)
  ├── task_templates[]        — Recurring task templates
  └── alerts[]                — System-generated alerts (với alert_reads join table)
      └── alert_reads[]       — Per-user read tracking
```

## Tables Specification

### `projects` (scoped to workspace)

```ts
import { pgTable, uuid, text, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),           // Better Auth org.id (text UUID)
  name: text('name').notNull(),
  domain: varchar('domain', { length: 500 }),
  description: text('description'),
  color: varchar('color', { length: 7 }),                // hex: '#FF5733'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  workspaceDomainUnique: uniqueIndex('projects_workspace_domain_unique').on(t.workspaceId, t.domain),
  workspaceIdx: index('projects_workspace_idx').on(t.workspaceId),
}));
```

### `gsc_connections` (replaces `oauth_tokens` + `gsc_sites`)

```ts
export const gscConnections = pgTable('gsc_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(),  // Better Auth user.id
  accountEmail: varchar('account_email', { length: 255 }),      // which Google account
  siteUrl: varchar('site_url', { length: 500 }).notNull(),
  permissionLevel: varchar('permission_level', { length: 50 }), // 'siteOwner' | 'siteFullUser'
  accessToken: text('access_token').notNull(),                  // encrypted (AES-256-GCM)
  refreshToken: text('refresh_token').notNull(),                // encrypted
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('idle'), // 'idle'|'syncing'|'error'
  syncError: text('sync_error'),                               // null khi OK, error message khi failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  projectIdx: index('gsc_conn_project_idx').on(t.projectId),
  workspaceIdx: index('gsc_conn_workspace_idx').on(t.workspaceId),
}));
```

### `ga4_connections` (replaces `oauth_tokens` + `ga4_properties`)

```ts
export const ga4Connections = pgTable('ga4_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(),  // Better Auth user.id
  accountEmail: varchar('account_email', { length: 255 }),
  propertyId: varchar('property_id', { length: 100 }).notNull(),
  propertyName: varchar('property_name', { length: 255 }),
  measurementId: varchar('measurement_id', { length: 50 }),
  accessToken: text('access_token').notNull(),                  // encrypted
  refreshToken: text('refresh_token').notNull(),                // encrypted
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('idle'),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  projectIdx: index('ga4_conn_project_idx').on(t.projectId),
  workspaceIdx: index('ga4_conn_workspace_idx').on(t.workspaceId),
}));
```

### `gsc_data` (same structure, NO workspaceId — resolve qua JOIN)

```ts
export const gscData = pgTable('gsc_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  // ⚠️ NO workspaceId — workspace resolved via JOIN: gsc_data → projects → workspace
  date: date('date').notNull(),
  page: varchar('page', { length: 1000 }).notNull(),
  query: varchar('query', { length: 500 }).notNull(),
  country: varchar('country', { length: 10 }).notNull().default('all'),
  device: varchar('device', { length: 20 }).notNull().default('all'),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: numeric('ctr', { precision: 5, scale: 4 }).notNull().default('0'),
  position: numeric('position', { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueEntry: uniqueIndex('gsc_data_unique_idx').on(t.projectId, t.date, t.page, t.query, t.country, t.device),
  projectDateIdx: index('gsc_data_project_date_idx').on(t.projectId, t.date),
  projectPageIdx: index('gsc_data_project_page_idx').on(t.projectId, t.page),
  projectQueryIdx: index('gsc_data_project_query_idx').on(t.projectId, t.query),
}));
```

### `gsc_data_aggregated` (kept — used by sync job, NO workspaceId)

```ts
export const gscDataAggregated = pgTable('gsc_data_aggregated', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  siteUrl: text('site_url').notNull(),
  date: date('date').notNull(),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: numeric('ctr', { precision: 6, scale: 4 }).notNull().default('0'),    // numeric not text
  position: numeric('position', { precision: 5, scale: 2 }).notNull().default('0'), // numeric not text
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  projectSiteDateUnique: uniqueIndex('gsc_agg_unique').on(t.projectId, t.siteUrl, t.date),
  projectDateIdx: index('gsc_agg_project_date_idx').on(t.projectId, t.date),
}));
```

### `ga4_data` (same structure, NO workspaceId, keep engagementRate + conversionRate)

```ts
export const ga4Data = pgTable('ga4_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  // ⚠️ NO workspaceId — resolve via JOIN
  date: date('date').notNull(),
  sessions: integer('sessions').notNull().default(0),
  users: integer('users').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 4 }).notNull().default('0'), // NOT bounceRate
  averageSessionDuration: numeric('average_session_duration', { precision: 10, scale: 2 }).notNull().default('0'),
  conversions: integer('conversions').notNull().default(0),
  conversionRate: numeric('conversion_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  revenue: numeric('revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  source: varchar('source', { length: 255 }).notNull().default('(direct)'),
  medium: varchar('medium', { length: 100 }).notNull().default('(none)'),
  deviceCategory: varchar('device_category', { length: 50 }).notNull().default('desktop'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueEntry: uniqueIndex('ga4_data_unique_idx').on(t.projectId, t.date, t.source, t.medium, t.deviceCategory),
  projectDateIdx: index('ga4_data_project_date_idx').on(t.projectId, t.date),
}));
```

### `goals` (NEW — no currentValue, computed via JOIN)

```ts
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  // Goals are always project-scoped (confirmed 2026-05-11) — projectId NOT NULL
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // 'traffic'|'ranking'|'conversion'|'custom'
  targetMetric: varchar('target_metric', { length: 100 }), // e.g. 'impressions', 'avg_position'
  targetValue: numeric('target_value', { precision: 12, scale: 4 }), // scale:4 supports 0.4050 = 40.50%
  // ⚠️ NO currentValue — derived, computed via API JOIN against gsc_data/ga4_data
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active'|'completed'|'cancelled'
  createdByUserId: text('created_by_user_id').notNull(),    // Better Auth user.id
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  workspaceProjectStatusIdx: index('goals_workspace_project_status_idx').on(t.workspaceId, t.projectId, t.status),
  projectIdx: index('goals_project_idx').on(t.projectId),
  createdByIdx: index('goals_created_by_idx').on(t.createdByUserId),
}));
```

### `sprints` (NEW — với projectId optional)

```ts
export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }), // optional project scope
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('planning'), // 'planning'|'active'|'completed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('sprints_workspace_idx').on(t.workspaceId),
  projectIdx: index('sprints_project_idx').on(t.projectId),
}));
```

### `tasks` v2 (redesigned — với indexes đầy đủ)

```ts
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('backlog'),
  // 'backlog'|'todo'|'in_progress'|'blocked'|'in_review'|'done'
  taskType: varchar('task_type', { length: 20 }),
  // 'technical'|'content'|'links'|'planning'|'meeting'|'audit'
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  // 'low'|'medium'|'high'|'urgent'
  affectsWebsite: boolean('affects_website').notNull().default(true),

  // Assignment — FK to Better Auth user.id (text)
  assigneeId: text('assignee_id'),
  reporterId: text('reporter_id').notNull(),

  // Time — tất cả đơn vị SECONDS (nhất quán)
  estimatedTime: integer('estimated_time'),               // seconds (renamed từ estimatedMinutes)
  timeSpent: integer('time_spent').notNull().default(0),  // seconds

  // Dates
  startDate: date('start_date'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),

  // Impact tracking
  expectedImpactStart: date('expected_impact_start'),
  expectedImpactEnd: date('expected_impact_end'),
  actualImpact: jsonb('actual_impact'),

  // Recurring
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringTemplateId: uuid('recurring_template_id'), // FK to task_templates.id
  // recurringConfig shape: { frequency: 'weekly'|'monthly'|..., dayOfWeek?: 0-6, dayOfMonth?: 1-31 }
  recurringConfig: jsonb('recurring_config'),

  // Metadata
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  // Board view: tasks by status within workspace
  workspaceStatusIdx: index('tasks_workspace_status_idx').on(t.workspaceId, t.status),
  // Project board view
  projectStatusIdx: index('tasks_project_status_idx').on(t.projectId, t.status),
  // Sprint board view
  sprintIdx: index('tasks_sprint_idx').on(t.sprintId),
  // Goal progress tracking
  goalIdx: index('tasks_goal_idx').on(t.goalId),
  // Workload visualization
  assigneeWorkspaceIdx: index('tasks_assignee_workspace_idx').on(t.assigneeId, t.workspaceId),
  // Upcoming/overdue tasks
  dueDateIdx: index('tasks_due_date_idx').on(t.dueDate),
  // Cron job: spawn recurring tasks
  isRecurringIdx: index('tasks_is_recurring_idx').on(t.isRecurring),
  // Recurring template idempotent spawn guard — prevents duplicate tasks from 2-tab race
  recurringSpawnUnique: uniqueIndex('tasks_recurring_template_date_unique').on(t.recurringTemplateId, t.startDate),
  // CHECK constraints
  statusCheck: check('tasks_status_check', sql`${t.status} IN ('backlog','todo','in_progress','blocked','in_review','done')`),
  priorityCheck: check('tasks_priority_check', sql`${t.priority} IN ('low','medium','high','urgent')`),
}));
```

### `task_templates` (NEW — for recurring tasks)

```ts
export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  taskType: varchar('task_type', { length: 20 }),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  affectsWebsite: boolean('affects_website').notNull().default(true),
  estimatedTime: integer('estimated_time'),  // seconds
  // recurringConfig shape: { frequency: 'daily'|'weekly'|'biweekly'|'monthly'|'quarterly',
  //   dayOfWeek?: 0-6, dayOfMonth?: 1-31, createDaysBefore?: number }
  recurringConfig: jsonb('recurring_config').notNull(),
  tags: text('tags').array(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('task_templates_workspace_idx').on(t.workspaceId),
}));
```

### `time_logs` (adapted — thêm userId, rename columns)

```ts
export const timeLogs = pgTable('time_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  userId: text('user_id').notNull(),    // Better Auth user.id
  startedAt: timestamp('started_at').notNull(),   // renamed từ startTime
  endedAt: timestamp('ended_at'),                 // renamed từ endTime
  duration: integer('duration'),                  // seconds
  note: text('note'),                             // renamed từ notes
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  taskIdIdx: index('time_logs_task_id_idx').on(t.taskId),
  userIdx: index('time_logs_user_idx').on(t.userId),
}));
```

### `alerts` (NEW — no isRead, dùng alert_reads join table)

```ts
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  // 'traffic_drop'|'ranking_drop'|'content_decay'|'anomaly'|'recommendation'
  severity: varchar('severity', { length: 20 }).notNull().default('info'),
  // 'info'|'warning'|'critical'
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'), // { url, keyword, metric, value, threshold, ... }
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  workspaceCreatedIdx: index('alerts_workspace_created_idx').on(t.workspaceId, t.createdAt),
  workspaceTypeIdx: index('alerts_workspace_type_idx').on(t.workspaceId, t.type),
  workspaceSeverityIdx: index('alerts_workspace_severity_idx').on(t.workspaceId, t.severity),
}));

// Per-user read tracking — replaces isRead boolean
export const alertReads = pgTable('alert_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),  // Better Auth user.id
  readAt: timestamp('read_at').notNull().defaultNow(),
}, (t) => ({
  alertUserUnique: uniqueIndex('alert_reads_alert_user_unique').on(t.alertId, t.userId),
  userIdx: index('alert_reads_user_idx').on(t.userId),
}));
```

## Related Code Files

**Rewrite:**
- `packages/db/src/schema/projects.ts`
- `packages/db/src/schema/tasks.ts`
- `packages/db/src/schema/gsc_data.ts`
- `packages/db/src/schema/gsc_data_aggregated.ts`
- `packages/db/src/schema/ga4_data.ts`
- `packages/db/src/schema/time-logs.ts`
- `packages/db/src/schema/index.ts`

**Create:**
- `packages/db/src/schema/goals.ts`
- `packages/db/src/schema/sprints.ts`
- `packages/db/src/schema/task-templates.ts`
- `packages/db/src/schema/alerts.ts`
- `packages/db/src/schema/gsc-connections.ts`
- `packages/db/src/schema/ga4-connections.ts`
- `packages/db/src/schema/alert-reads.ts`

**Delete:**
- `packages/db/src/schema/integrations.ts` (replaced by gsc-connections + ga4-connections)

**Adapt (GSC/GA4 sync):**
- `packages/api-app/src/jobs/sync-gsc.ts` — Use `gscConnections` + `gscDataAggregated` (uuid FKs)
- `packages/api-app/src/jobs/sync-ga4.ts` — Use `ga4Connections` (uuid FKs), keep `engagementRate`
- `packages/api-app/src/utils/token-refresh.ts` — Adapt to new connection tables

**Implemented 2026-05-14:**
- Rebuilt DB business schema with UUID PK/FK columns, workspace-scoped projects/tasks/connections, goals/sprints/templates/alerts, and analytics tables without `workspaceId`.
- Adapted `packages/api-app` routes, sync jobs, OAuth callback routes, token refresh, project/task/time-log schemas, and correlation/analytics ID handling.
- Adapted shared types and current web project/task/integration surfaces from numeric IDs to string UUID IDs.
- Removed stale generated `packages/db/src/*.js` schema artifacts so Drizzle resolves `.ts` schema files, then applied fresh schema to local DB after backup.
- Added workspace ownership checks for analytics/read routes, OAuth authorization/callback writes, and task goal/sprint references after code review.
- Removed stale duplicate `apps/api` implementation files; `apps/api` now stays a thin dev wrapper plus tests.
- Local DB backup: `/tmp/seo-impact-os-phase02-20260514-084302/seo_impact_os_before_phase02.sql`.

## Implementation Steps

1. **Backup existing data** — export CSV trước khi drop:
   ```bash
   psql $DATABASE_URL -c "\COPY tasks TO '/tmp/tasks_backup.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY projects TO '/tmp/projects_backup.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY gsc_data TO '/tmp/gsc_data_backup.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY gsc_data_aggregated TO '/tmp/gsc_agg_backup.csv' CSV HEADER"
   psql $DATABASE_URL -c "\COPY ga4_data TO '/tmp/ga4_data_backup.csv' CSV HEADER"
   ```
2. **Rewrite schema files** — Theo spec trong phase này (UUID PKs, no serial)
3. **Create new schema files** — goals, sprints, task-templates, alerts, alert-reads, gsc-connections, ga4-connections
4. **Update `schema/index.ts`** — Export tất cả tables mới, xóa export `integrations`; **giữ nguyên** `export * from './auth-schema'` (created by Phase 01)
5. **Run `npm run db:push`** — Apply schema to DB
6. **Adapt sync jobs** — Update `sync-gsc.ts` và `sync-ga4.ts` dùng table names mới + uuid FKs
7. **Update `packages/types/src/index.ts`** — Rewrite shared TypeScript types
8. **Run `npm run type-check`** — Verify compile

## Todo

- [x] Backup existing local data before destructive schema reset
- [x] Rewrite `packages/db/src/schema/projects.ts` (uuid PK, uniqueIndex workspaceId+domain)
- [x] Create `packages/db/src/schema/gsc-connections.ts` (replaces integrations for GSC)
- [x] Create `packages/db/src/schema/ga4-connections.ts` (replaces integrations for GA4)
- [x] Delete `packages/db/src/schema/integrations.ts`
- [x] Rewrite `packages/db/src/schema/gsc_data.ts` (uuid PK+FK, NO workspaceId)
- [x] Rewrite `packages/db/src/schema/gsc_data_aggregated.ts` (uuid PK+FK, numeric ctr/position)
- [x] Rewrite `packages/db/src/schema/ga4_data.ts` (uuid PK+FK, engagementRate NOT bounceRate, keep conversionRate/source/medium/deviceCategory)
- [x] Create `packages/db/src/schema/goals.ts` (NO currentValue; projectId NOT NULL — project-scoped; targetValue precision 12,4)
- [x] Create `packages/db/src/schema/sprints.ts` (với projectId optional)
- [x] Rewrite `packages/db/src/schema/tasks.ts` (uuid, estimatedTime in seconds, full indexes)
- [x] Create `packages/db/src/schema/task-templates.ts`
- [x] Rewrite `packages/db/src/schema/time-logs.ts` (uuid, userId, rename startedAt/endedAt/note)
- [x] Create `packages/db/src/schema/alerts.ts` (NO isRead)
- [x] Create `packages/db/src/schema/alert-reads.ts` (per-user read tracking)
- [x] Update `packages/db/src/schema/index.ts` (export all new tables; preserve `export * from './auth-schema'` từ Phase 01)
- [x] Run DB push against local DB after backup
- [x] Adapt `sync-gsc.ts` to use `gscConnections` + uuid FKs
- [x] Adapt `sync-ga4.ts` to use `ga4Connections` + `engagementRate` field + uuid FKs
- [x] Adapt `token-refresh.ts` to new connection table structure
- [x] Rewrite `packages/types/src/index.ts`
- [x] Run `npm run type-check`

## Success Criteria

- [x] All new tables exist in local DB (verified via `psql` + Drizzle push)
- [x] Better Auth tables preserved in schema exports and created cleanly in local DB
- [x] All business PKs are UUID (verified via DB column inspection + no stale JS schema artifacts)
- [x] `gsc_data` and `ga4_data` have NO `workspaceId` column
- [x] `ga4_data` has `engagement_rate` column (NOT `bounce_rate`)
- [x] `tasks` has `estimated_time` column in seconds (NOT `estimated_minutes`)
- [x] `alerts` has NO `is_read` column — read tracking via `alert_reads` table
- [x] GSC sync job type-checks against new `gscConnections` schema
- [x] GA4 sync job type-checks against new `ga4Connections` schema and `engagementRate`
- [x] Analytics/read routes verify `projectId` belongs to active workspace before querying project-only fact tables
- [x] GSC/GA4 OAuth authorize/callback verifies project ownership before connection write
- [x] `npm run type-check` passes
- [x] `npx turbo run test --force` passes
- [x] `npm run lint` passes with no ESLint warnings or errors
- [x] `npm run build` passes with local placeholder env vars

## Risk Assessment

- **Data loss**: Fresh start — existing tasks/GSC data reset (user confirmed acceptable)
- **OAuth tokens**: Existing tokens lost — user cần re-authorize GSC/GA4 sau migration
- **UUID migration**: Cần xác nhận Better Auth organization.id type trước khi implement (text UUID hay native uuid?)
- **Sync jobs**: Test carefully — uuid FK type change có thể gây lỗi nếu còn hardcoded serial references

## Unresolved Questions

1. ~~**Better Auth organization.id type**~~: **RESOLVED** — Better Auth dùng `text` (UUID string), không phải native `uuid`. Confirmed qua `@better-auth/cli generate` output trong Phase 01. `text('workspace_id')` trong Phase 02 là đúng.
2. **gsc_data_aggregated merged hay separate**: Giữ 2 tables (current) hay merge với `gsc_data` + `is_aggregated` flag? Giữ nguyên 2 tables là clean hơn cho sync logic.
3. ~~**alert_reads MVP scope**~~: **RESOLVED** — implemented `alert_reads` join table now; no `isRead` boolean.
4. **goals.currentValue computation**: Phase 06 (Analytics Intelligence) owns derived progress/query logic.
5. **Remote DB target**: Local DB push completed. Default un-overridden `DATABASE_URL` still points to stale Supabase project `jtdeuxvwcwtqzjndhrlg` and fails with `tenant/user ... not found`; update env before any remote push.
