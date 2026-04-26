import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from '@repo/api-app';

const port = parseInt(process.env.PORT || process.env.API_PORT || '3001');

serve({
    fetch: app.fetch,
    port,
}, async () => {
    console.log(`🚀 Hono API running on port ${port}`);

    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL is not set.');
    } else {
        console.log('✅ DATABASE_URL detected');
        try {
            const { db, projects } = await import('@repo/db');
            const testQuery = await db.select().from(projects).limit(1);
            console.log(`✅ Database connected! Found ${testQuery.length} project(s)`);
        } catch (dbError) {
            console.error('❌ Database connection FAILED!', dbError);
        }
    }

    // Background sync jobs — only when ENABLE_CRON=true (local testing) or production standalone
    if (process.env.ENABLE_CRON === 'true') {
        const { startAllSyncJobs } = await import('@repo/api-app');
        startAllSyncJobs();
    }
});
