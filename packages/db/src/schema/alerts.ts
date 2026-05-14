import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, jsonb, timestamp, index, check } from 'drizzle-orm/pg-core';
import { projects } from './projects';

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
}, (table) => ({
  workspaceCreatedIdx: index('alerts_workspace_created_idx').on(table.workspaceId, table.createdAt),
  workspaceTypeIdx: index('alerts_workspace_type_idx').on(table.workspaceId, table.type),
  workspaceSeverityIdx: index('alerts_workspace_severity_idx').on(table.workspaceId, table.severity),
  typeCheck: check('alerts_type_check', sql`${table.type} IN ('traffic_drop','ranking_drop','content_decay','anomaly','recommendation')`),
  severityCheck: check('alerts_severity_check', sql`${table.severity} IN ('info','warning','critical')`),
}));

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
