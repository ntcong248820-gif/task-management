import { pgTable, uuid, text, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  domain: varchar('domain', { length: 500 }),
  description: text('description'),
  color: varchar('color', { length: 7 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceDomainUnique: uniqueIndex('projects_workspace_domain_unique').on(table.workspaceId, table.domain),
  workspaceIdx: index('projects_workspace_idx').on(table.workspaceId),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
