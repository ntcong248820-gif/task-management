import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL || 'postgresql://kong.peterpan@localhost:5432/seo_impact_os';

// Validate database URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Parse connection details for logging and configuration
const isSupabase = databaseUrl.includes('supabase.com');
const isPooler = databaseUrl.includes(':6543') || databaseUrl.includes('pooler');
const isDirectConnection = databaseUrl.includes(':5432');

// Log sanitized URL for debugging (hide password)
const sanitizedUrl = databaseUrl.replace(/:[^:@]+@/, ':***@');
console.log('[DB] Connecting to:', sanitizedUrl);
console.log('[DB] Connection type:', isDirectConnection ? 'Direct (5432)' : isPooler ? 'Pooler (6543)' : 'Custom');
console.log('[DB] SSL:', isSupabase ? 'ENABLED' : 'DISABLED');
console.log('[DB] Prepared statements:', !isPooler ? 'ENABLED' : 'DISABLED');

// Warn if using pooler (known to have issues)
if (isPooler) {
    console.warn('[DB] ⚠️  WARNING: Using connection pooler (port 6543)');
    console.warn('[DB] ⚠️  If you encounter "Tenant or user not found" errors,');
    console.warn('[DB] ⚠️  switch to direct connection (port 5432).');
    console.warn('[DB] ⚠️  See DATABASE_TROUBLESHOOTING.md for details.');
}

const queryClient = postgres(databaseUrl, {
    ssl: isSupabase ? 'require' : false,
    prepare: isPooler ? false : undefined, // CRITICAL: Disable for Supabase pooler (PgBouncer transaction mode)
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
});

// Create Drizzle instance
// IMPORTANT: Database uses snake_case (created_at) but schema uses camelCase (createdAt)
// Enable casing conversion to map between them
export const db = drizzle(queryClient, {
    schema,
    casing: 'snake_case', // Convert camelCase to snake_case for DB queries
});

// Export all schemas
export * from './schema/projects';
export * from './schema/tasks';
export * from './schema/time-logs';
export * from './schema/integrations';
export * from './schema/gsc_data';
export * from './schema/ga4_data';

// Export drizzle-orm utilities for use in other packages
export { eq, and, or, not, sql, desc, asc, gte, lte } from 'drizzle-orm';

// Export types
export type Database = typeof db;
