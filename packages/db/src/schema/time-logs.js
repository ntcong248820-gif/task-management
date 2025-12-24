import { pgTable, serial, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
import { tasks } from './tasks';
export const timeLogs = pgTable('time_logs', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
        .references(() => tasks.id, { onDelete: 'cascade' })
        .notNull(),
    // Time tracking
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    duration: integer('duration'), // seconds (computed on stop)
    // Notes
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Index for fast lookups
    taskIdIdx: index('time_logs_task_id_idx').on(table.taskId),
}));
