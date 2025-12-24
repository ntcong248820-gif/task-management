import { pgTable, serial, integer, date, timestamp, index, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects';
/**
 * GSC Aggregated Data Table
 *
 * Purpose: Store date-level aggregated metrics from GSC API
 * Dimensions: ['date'] only
 *
 * This table contains accurate totals that match GSC dashboard.
 * Use this for dashboard metrics and period comparisons.
 */
export const gscDataAggregated = pgTable('gsc_data_aggregated', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .references(() => projects.id, { onDelete: 'cascade' })
        .notNull(),
    // Site URL to differentiate data from multiple sites in same project
    siteUrl: text('site_url').notNull(),
    // Date dimension
    date: date('date').notNull(),
    // Aggregated metrics (no dimensions)
    clicks: integer('clicks').notNull().default(0),
    impressions: integer('impressions').notNull().default(0),
    ctr: text('ctr').notNull().default('0'), // Stored as string for precision
    position: text('position').notNull().default('0'), // Stored as string for precision
    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: one row per project per site per date
    projectSiteDateUnique: uniqueIndex('gsc_agg_project_site_date_unique').on(table.projectId, table.siteUrl, table.date),
    // Index for date range queries
    projectDateIdx: index('gsc_agg_project_date_idx').on(table.projectId, table.date),
    dateIdx: index('gsc_agg_date_idx').on(table.date),
    siteUrlIdx: index('gsc_agg_site_url_idx').on(table.siteUrl),
}));
