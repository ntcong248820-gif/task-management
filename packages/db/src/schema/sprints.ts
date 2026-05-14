import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, date, timestamp, index, check } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { goals } from './goals';

export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('planning'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index('sprints_workspace_idx').on(table.workspaceId),
  projectIdx: index('sprints_project_idx').on(table.projectId),
  statusCheck: check('sprints_status_check', sql`${table.status} IN ('planning','active','completed')`),
}));

export type Sprint = typeof sprints.$inferSelect;
export type NewSprint = typeof sprints.$inferInsert;
