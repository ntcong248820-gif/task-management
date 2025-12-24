import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
export const projects = pgTable('projects', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    client: text('client'),
    domain: text('domain'),
    status: text('status').default('active').notNull(), // 'active' | 'archived'
    description: text('description'),
    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
