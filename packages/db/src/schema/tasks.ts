import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, integer, timestamp, jsonb, index, date, check, varchar, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { goals } from './goals';
import { sprints } from './sprints';
import { taskTemplates } from './task-templates';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('backlog'),
  taskType: varchar('task_type', { length: 20 }),
  priority: varchar('priority', { length: 10 }).default('medium').notNull(),
  affectsWebsite: boolean('affects_website').notNull().default(true),
  assigneeId: text('assignee_id'),
  reporterId: text('reporter_id').notNull(),
  estimatedTime: integer('estimated_time'),
  timeSpent: integer('time_spent').default(0).notNull(),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),
  expectedImpactStart: date('expected_impact_start'),
  expectedImpactEnd: date('expected_impact_end'),
  actualImpact: jsonb('actual_impact'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringTemplateId: uuid('recurring_template_id').references(() => taskTemplates.id, { onDelete: 'set null' }),
  recurringConfig: jsonb('recurring_config'),
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceStatusIdx: index('tasks_workspace_status_idx').on(table.workspaceId, table.status),
  projectStatusIdx: index('tasks_project_status_idx').on(table.projectId, table.status),
  sprintIdx: index('tasks_sprint_idx').on(table.sprintId),
  goalIdx: index('tasks_goal_idx').on(table.goalId),
  assigneeWorkspaceIdx: index('tasks_assignee_workspace_idx').on(table.assigneeId, table.workspaceId),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
  isRecurringIdx: index('tasks_is_recurring_idx').on(table.isRecurring),
  completedAtIdx: index('tasks_completed_at_idx').on(table.completedAt),
  recurringSpawnUnique: uniqueIndex('tasks_recurring_template_date_unique').on(table.recurringTemplateId, table.startDate),
  statusCheck: check('tasks_status_check', sql`${table.status} IN ('backlog','todo','in_progress','blocked','in_review','done')`),
  taskTypeCheck: check('tasks_task_type_check', sql`${table.taskType} IS NULL OR ${table.taskType} IN ('technical','content','links','planning','meeting','audit')`),
  priorityCheck: check('tasks_priority_check', sql`${table.priority} IN ('low','medium','high','urgent')`),
}));

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
