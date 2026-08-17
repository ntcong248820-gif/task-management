import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, jsonb, timestamp, index, check } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { tasks } from './tasks';

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('info'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('new'),
  acceptedBy: text('accepted_by'),
  acceptedAt: timestamp('accepted_at'),
  dismissedBy: text('dismissed_by'),
  dismissedAt: timestamp('dismissed_at'),
  linkedTaskId: uuid('linked_task_id').references(() => tasks.id, { onDelete: 'set null' }),
}, (table) => ({
  workspaceCreatedIdx: index('alerts_workspace_created_idx').on(table.workspaceId, table.createdAt),
  workspaceTypeIdx: index('alerts_workspace_type_idx').on(table.workspaceId, table.type),
  workspaceSeverityIdx: index('alerts_workspace_severity_idx').on(table.workspaceId, table.severity),
  workspaceStatusIdx: index('alerts_workspace_status_idx').on(table.workspaceId, table.status),
  // Note: expression-based UNIQUE INDEX on (project_id, type, DATE(created_at)) must be applied
  // via a raw SQL migration — Drizzle does not support expression indexes in schema builder.
  // Dedup is enforced in insertAlert() via a pre-check query.
  typeCheck: check('alerts_type_check', sql`${table.type} IN ('traffic_drop','ranking_drop','content_decay','anomaly','recommendation','correlated_drop','source_discrepancy')`),
  severityCheck: check('alerts_severity_check', sql`${table.severity} IN ('info','warning','critical')`),
  statusCheck: check('alerts_status_check', sql`${table.status} IN ('new','accepted','dismissed','task_created')`),
}));

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
