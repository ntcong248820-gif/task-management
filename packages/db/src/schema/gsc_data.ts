import { pgTable, serial, integer, varchar, date, decimal, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Google Search Console Data Table
 * Stores search analytics data from GSC API
 */
export const gscData = pgTable('gsc_data', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),

    // Date dimension
    date: date('date').notNull(),

    // Page and query dimensions
    page: varchar('page', { length: 1000 }).notNull(),
    query: varchar('query', { length: 500 }).notNull(),

    // Additional dimensions
    country: varchar('country', { length: 10 }).notNull().default('all'), // 'usa', 'vnm', 'all'
    device: varchar('device', { length: 20 }).notNull().default('all'), // 'desktop', 'mobile', 'tablet', 'all'

    // Metrics
    clicks: integer('clicks').notNull().default(0),
    impressions: integer('impressions').notNull().default(0),
    ctr: decimal('ctr', { precision: 5, scale: 4 }).notNull().default('0'), // 0.1234 = 12.34%
    position: decimal('position', { precision: 5, scale: 2 }).notNull().default('0'), // 1.23

    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    // Unique constraint to prevent duplicates
    uniqueEntry: uniqueIndex('gsc_data_unique_idx').on(
        table.projectId,
        table.date,
        table.page,
        table.query,
        table.country,
        table.device
    ),
    // Performance indexes
    projectDateIdx: index('gsc_data_project_date_idx').on(table.projectId, table.date),
    projectPageIdx: index('gsc_data_project_page_idx').on(table.projectId, table.page),
    projectQueryIdx: index('gsc_data_project_query_idx').on(table.projectId, table.query),
}));
