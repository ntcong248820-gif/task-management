import { pgTable, uuid, integer, date, timestamp, index, text, uniqueIndex, numeric } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const gscDataAggregated = pgTable('gsc_data_aggregated', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  siteUrl: text('site_url').notNull(),
  date: date('date').notNull(),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: numeric('ctr', { precision: 6, scale: 4 }).notNull().default('0'),
  position: numeric('position', { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectSiteDateUnique: uniqueIndex('gsc_agg_project_site_date_unique').on(
    table.projectId,
    table.siteUrl,
    table.date
  ),
  projectDateIdx: index('gsc_agg_project_date_idx').on(table.projectId, table.date),
  dateIdx: index('gsc_agg_date_idx').on(table.date),
  siteUrlIdx: index('gsc_agg_site_url_idx').on(table.siteUrl),
}));

export type GSCDataAggregated = typeof gscDataAggregated.$inferSelect;
export type NewGSCDataAggregated = typeof gscDataAggregated.$inferInsert;
