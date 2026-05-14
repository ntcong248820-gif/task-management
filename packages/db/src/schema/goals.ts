import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, date, numeric, timestamp, index, check } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(),
  targetMetric: varchar('target_metric', { length: 100 }),
  targetValue: numeric('target_value', { precision: 12, scale: 4 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceProjectStatusIdx: index('goals_workspace_project_status_idx').on(table.workspaceId, table.projectId, table.status),
  projectIdx: index('goals_project_idx').on(table.projectId),
  createdByIdx: index('goals_created_by_idx').on(table.createdByUserId),
  typeCheck: check('goals_type_check', sql`${table.type} IN ('traffic','ranking','conversion','custom')`),
  statusCheck: check('goals_status_check', sql`${table.status} IN ('active','completed','cancelled')`),
}));

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
