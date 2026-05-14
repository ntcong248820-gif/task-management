import { pgTable, uuid, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { alerts } from './alerts';

export const alertReads = pgTable('alert_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  readAt: timestamp('read_at').notNull().defaultNow(),
}, (table) => ({
  alertUserUnique: uniqueIndex('alert_reads_alert_user_unique').on(table.alertId, table.userId),
  userIdx: index('alert_reads_user_idx').on(table.userId),
}));

export type AlertRead = typeof alertReads.$inferSelect;
export type NewAlertRead = typeof alertReads.$inferInsert;
