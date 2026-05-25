import { pgTable, uuid, integer, varchar, date, numeric, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const gscData = pgTable('gsc_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  page: varchar('page', { length: 1000 }).notNull(),
  query: varchar('query', { length: 500 }).notNull(),
  country: varchar('country', { length: 10 }).notNull().default('all'),
  device: varchar('device', { length: 20 }).notNull().default('all'),
  clicks: integer('clicks').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  ctr: numeric('ctr', { precision: 5, scale: 4 }).notNull().default('0'),
  position: numeric('position', { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueEntry: uniqueIndex('gsc_data_unique_idx').on(
    table.projectId,
    table.date,
    table.page,
    table.query,
    table.country,
    table.device
  ),
  projectDateIdx: index('gsc_data_project_date_idx').on(table.projectId, table.date),
  projectPageIdx: index('gsc_data_project_page_idx').on(table.projectId, table.page),
  projectQueryIdx: index('gsc_data_project_query_idx').on(table.projectId, table.query),
  projectQueryDateIdx: index('gsc_data_project_query_date_idx').on(table.projectId, table.query, table.date),
  projectPageDateIdx: index('gsc_data_project_page_date_idx').on(table.projectId, table.page, table.date),
}));

export type GSCData = typeof gscData.$inferSelect;
export type NewGSCData = typeof gscData.$inferInsert;
