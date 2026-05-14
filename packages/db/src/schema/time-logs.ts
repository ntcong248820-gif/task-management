import { pgTable, uuid, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
import { tasks } from './tasks';

export const timeLogs = pgTable('time_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  workspaceId: text('workspace_id').notNull(),
  userId: text('user_id').notNull(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index('time_logs_task_id_idx').on(table.taskId),
  userIdx: index('time_logs_user_idx').on(table.userId),
}));

export type TimeLog = typeof timeLogs.$inferSelect;
export type NewTimeLog = typeof timeLogs.$inferInsert;
