import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, varchar, timestamp, index, check, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const ga4Connections = pgTable('ga4_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(),
  accountEmail: varchar('account_email', { length: 255 }),
  propertyId: varchar('property_id', { length: 100 }).notNull(),
  propertyName: varchar('property_name', { length: 255 }),
  measurementId: varchar('measurement_id', { length: 50 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastAttemptedAt: timestamp('last_attempted_at'),
  lastSyncedAt: timestamp('last_synced_at'),
  lastRowsSynced: integer('last_rows_synced'),
  lastDurationMs: integer('last_duration_ms'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('idle'),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  projectIdx: index('ga4_conn_project_idx').on(table.projectId),
  workspaceIdx: index('ga4_conn_workspace_idx').on(table.workspaceId),
  syncStatusCheck: check('ga4_conn_sync_status_check', sql`${table.syncStatus} IN ('idle','syncing','error')`),
  activeSourceIdx: uniqueIndex('ga4_conn_active_source_idx').on(table.workspaceId, table.projectId).where(sql`${table.isActive} = true`),
  resourceUniqueIdx: uniqueIndex('ga4_conn_resource_unique_idx').on(table.workspaceId, table.projectId, table.propertyId),
}));

export type GA4Connection = typeof ga4Connections.$inferSelect;
export type NewGA4Connection = typeof ga4Connections.$inferInsert;
