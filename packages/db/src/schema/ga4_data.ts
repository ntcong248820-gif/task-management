import { pgTable, uuid, integer, varchar, date, numeric, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const ga4Data = pgTable('ga4_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  sessions: integer('sessions').notNull().default(0),
  users: integer('users').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  engagementRate: numeric('engagement_rate', { precision: 8, scale: 4 }).notNull().default('0'),
  averageSessionDuration: numeric('average_session_duration', { precision: 10, scale: 2 }).notNull().default('0'),
  conversions: integer('conversions').notNull().default(0),
  conversionRate: numeric('conversion_rate', { precision: 10, scale: 4 }).notNull().default('0'),
  revenue: numeric('revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  source: varchar('source', { length: 255 }).notNull().default('(direct)'),
  medium: varchar('medium', { length: 100 }).notNull().default('(none)'),
  deviceCategory: varchar('device_category', { length: 50 }).notNull().default('desktop'),
  propertyId: varchar('property_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueEntry: uniqueIndex('ga4_data_unique_v2_idx').on(
    table.projectId,
    table.propertyId,
    table.date,
    table.source,
    table.medium,
    table.deviceCategory
  ),
  projectDateIdx: index('ga4_data_project_date_idx').on(table.projectId, table.date),
  projectSourceDateIdx: index('ga4_data_project_source_date_idx').on(table.projectId, table.source, table.date),
}));

export type GA4Data = typeof ga4Data.$inferSelect;
export type NewGA4Data = typeof ga4Data.$inferInsert;
