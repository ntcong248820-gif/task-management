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
const isPort5432 = databaseUrl.includes(':5432'); // Session Mode Pooler (recommended)
const isPort6543 = databaseUrl.includes(':6543'); // Transaction Mode (not recommended)

// Determine connection mode and prepared statement support
let connectionType = 'Custom';
let preparedStatementsEnabled = true;

if (isPort5432) {
    connectionType = 'Session Mode Pooler (5432)';
    preparedStatementsEnabled = true; // Session mode supports prepared statements
} else if (isPort6543) {
    connectionType = 'Transaction Mode Pooler (6543)';
    preparedStatementsEnabled = false; // Transaction mode does NOT support prepared statements
}

// Log sanitized URL for debugging (hide password)
const sanitizedUrl = databaseUrl.replace(/:[^:@]+@/, ':***@');
console.log('[DB] Connecting to:', sanitizedUrl);
console.log('[DB] Connection type:', connectionType);
console.log('[DB] SSL:', isSupabase ? 'ENABLED' : 'DISABLED');
console.log('[DB] Prepared statements:', preparedStatementsEnabled ? 'ENABLED' : 'DISABLED');

// Warn if using port 6543 (known to have issues)
if (isPort6543) {
    console.warn('[DB] ⚠️  WARNING: Using port 6543 (Transaction Mode)');
    console.warn('[DB] ⚠️  This port has known "Tenant or user not found" errors');
    console.warn('[DB] ⚠️  RECOMMENDED: Switch to port 5432 (Session Mode)');
    console.warn('[DB] ⚠️  See DATABASE_TROUBLESHOOTING.md for details');
}

const queryClient = postgres(databaseUrl, {
    ssl: isSupabase ? 'require' : false,
    prepare: preparedStatementsEnabled ? undefined : false, // Disable ONLY for port 6543 (transaction mode)
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
