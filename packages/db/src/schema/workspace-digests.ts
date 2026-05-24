import { pgTable, uuid, text, date, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';

export const workspaceDigests = pgTable('workspace_digests', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  weekStart: date('week_start').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueWeek: unique().on(t.workspaceId, t.weekStart),
}));

export type WorkspaceDigest = typeof workspaceDigests.$inferSelect;
export type NewWorkspaceDigest = typeof workspaceDigests.$inferInsert;
