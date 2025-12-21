import { pgTable, serial, integer, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * OAuth Tokens Table
 * Stores OAuth 2.0 tokens for Google API integrations
 */
export const oauthTokens = pgTable('oauth_tokens', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),

    // OAuth provider info
    provider: varchar('provider', { length: 50 }).notNull(), // 'google_search_console' | 'google_analytics'

    // Token data
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    tokenType: varchar('token_type', { length: 50 }).notNull().default('Bearer'),
    scope: text('scope').notNull(),

    // Account info
    accountEmail: varchar('account_email', { length: 255 }),

    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Google Search Console Sites Table
 * Stores GSC site/property information
 */
export const gscSites = pgTable('gsc_sites', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),

    // Site info
    siteUrl: varchar('site_url', { length: 500 }).notNull(),
    permissionLevel: varchar('permission_level', { length: 50 }), // 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser'

    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Google Analytics Properties Table
 * Stores GA4 property information
 */
export const ga4Properties = pgTable('ga4_properties', {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),

    // Property info
    propertyId: varchar('property_id', { length: 100 }).notNull(), // e.g., '123456789'
    propertyName: varchar('property_name', { length: 255 }),

    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Import projects table for foreign key reference
import { projects } from './projects';
