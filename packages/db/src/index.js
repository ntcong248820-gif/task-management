import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL || 'postgresql://kong.peterpan@localhost:5432/seo_impact_os';
// Create PostgreSQL connection
const queryClient = postgres(databaseUrl);
// Create Drizzle instance
export const db = drizzle(queryClient, { schema });
// Export all schemas
export * from './schema/projects';
export * from './schema/tasks';
export * from './schema/time-logs';
export * from './schema/integrations';
export * from './schema/gsc_data';
export * from './schema/ga4_data';
// Export drizzle-orm utilities for use in other packages
export { eq, and, or, not, sql, desc, asc, gte, lte } from 'drizzle-orm';
