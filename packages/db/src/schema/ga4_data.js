import { pgTable, serial, integer, varchar, date, decimal, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
/**
 * Google Analytics 4 Data Table
 * Stores analytics metrics from GA4 API
 */
export const ga4Data = pgTable('ga4_data', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    // Date dimension
    date: date('date').notNull(),
    // Traffic metrics
    sessions: integer('sessions').notNull().default(0),
    users: integer('users').notNull().default(0),
    newUsers: integer('new_users').notNull().default(0),
    // Engagement metrics
    engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }).notNull().default('0'), // 0.7500 = 75%
    averageSessionDuration: decimal('average_session_duration', { precision: 10, scale: 2 }).notNull().default('0'), // seconds
    // Conversion metrics
    conversions: integer('conversions').notNull().default(0),
    conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    // Revenue metrics
    revenue: decimal('revenue', { precision: 12, scale: 2 }).notNull().default('0'), // dollars
    // Dimensions
    source: varchar('source', { length: 255 }).notNull().default('(direct)'),
    medium: varchar('medium', { length: 100 }).notNull().default('(none)'),
    deviceCategory: varchar('device_category', { length: 50 }).notNull().default('desktop'),
    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    // Unique constraint to prevent duplicates
    uniqueEntry: uniqueIndex('ga4_data_unique_idx').on(table.projectId, table.date, table.source, table.medium, table.deviceCategory),
    // Performance indexes
    projectDateIdx: index('ga4_data_project_date_idx').on(table.projectId, table.date),
}));
