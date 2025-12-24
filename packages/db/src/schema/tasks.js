import { pgTable, serial, text, integer, timestamp, jsonb, index, date } from 'drizzle-orm/pg-core';
import { projects } from './projects';
export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .references(() => projects.id, { onDelete: 'cascade' })
        .notNull(),
    // Task details
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('todo'), // 'todo' | 'in_progress' | 'done'
    taskType: text('task_type'), // 'technical' | 'content' | 'links'
    priority: text('priority').default('medium').notNull(), // 'low' | 'medium' | 'high'
    // Assignment
    assignedTo: text('assigned_to'), // "Peter", "Minh" (no FK for simplicity)
    // Time tracking
    timeSpent: integer('time_spent').default(0).notNull(), // seconds
    estimatedTime: integer('estimated_time'), // seconds
    // Impact tracking
    completedAt: timestamp('completed_at'),
    expectedImpactStart: date('expected_impact_start'),
    expectedImpactEnd: date('expected_impact_end'),
    actualImpact: jsonb('actual_impact'), // { traffic_increase: 15%, ranking_improvement: 5 }
    // Metadata
    tags: text('tags').array(), // ['schema', 'h1-fix', 'urgent']
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Indexes for performance
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    statusIdx: index('tasks_status_idx').on(table.status),
    completedAtIdx: index('tasks_completed_at_idx').on(table.completedAt),
}));
