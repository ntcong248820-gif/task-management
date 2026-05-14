import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, integer, jsonb, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';

export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  taskType: varchar('task_type', { length: 20 }),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  affectsWebsite: boolean('affects_website').notNull().default(true),
  estimatedTime: integer('estimated_time'),
  recurringConfig: jsonb('recurring_config').notNull(),
  tags: text('tags').array(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index('task_templates_workspace_idx').on(table.workspaceId),
  taskTypeCheck: check('task_templates_task_type_check', sql`${table.taskType} IS NULL OR ${table.taskType} IN ('technical','content','links','planning','meeting','audit')`),
  priorityCheck: check('task_templates_priority_check', sql`${table.priority} IN ('low','medium','high','urgent')`),
}));

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;
