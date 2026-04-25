import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';
import { rateLimiter } from 'hono-rate-limiter';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import timeLogsRoutes from './routes/time-logs';
import gscRoutes from './routes/integrations/gsc';
import ga4Routes from './routes/integrations/ga4';
import integrationsRoutes from './routes/integrations/index';
import analyticsRoutes from './routes/analytics';
import correlationRoutes from './routes/correlation';
import rankingsRoutes from './routes/rankings';
import urlsRoutes from './routes/urls';
import diagnosisRoutes from './routes/diagnosis';
import keywordsRoutes from './routes/keywords';


const app = new Hono();

// Middleware
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_URL || '',
    process.env.FRONTEND_URL_PREVIEW || '',
  ].filter(Boolean) as string[],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
app.use('*', logger());
app.use('*', prettyJSON());

// Rate limiting on sync and authorize routes.
// Use the last segment of x-forwarded-for (Render appends the real client IP last)
// to prevent spoofing via a crafted x-forwarded-for header.
const getClientIp = (c: any): string => {
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',').pop()!.trim();
    return c.req.header('cf-connecting-ip') ?? 'anonymous';
};
app.use('/api/integrations/*/sync', rateLimiter({
    windowMs: 60_000,
    limit: 5,
    keyGenerator: getClientIp,
}));
app.use('/api/integrations/*/authorize', rateLimiter({
    windowMs: 60_000,
    limit: 10,
    keyGenerator: getClientIp,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'SEO Impact OS API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'SEO Impact OS API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      tasks: '/api/tasks',
      timeLogs: '/api/time-logs',
      analytics: '/api/analytics',
      rankings: '/api/rankings',
      integrations: {
        gsc: '/api/integrations/gsc',
        ga4: '/api/integrations/ga4',
      },
    }
  });
});

// Register routes
app.route('/api/projects', projectsRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/time-logs', timeLogsRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/correlation', correlationRoutes);
app.route('/api/rankings', rankingsRoutes);
app.route('/api/urls', urlsRoutes);
app.route('/api/diagnosis', diagnosisRoutes);
app.route('/api/keywords', keywordsRoutes);
app.route('/api/integrations', integrationsRoutes);
app.route('/api/integrations/gsc', gscRoutes);
app.route('/api/integrations/ga4', ga4Routes);

import { startAllSyncJobs } from './jobs';

// Start server
const port = parseInt(process.env.PORT || process.env.API_PORT || '3001');

serve({
  fetch: app.fetch,
  port,
}, async () => {
  console.log(`🚀 Hono API running on port ${port}`);

  // Check Database Connection
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL is not set. Using local default which may fail in production.');
  } else {
    console.log('✅ DATABASE_URL is detected');

    // Test database connection
    try {
      console.log('🔍 Testing database connection...');
      const { db, projects } = await import('@repo/db');
      const testQuery = await db.select().from(projects).limit(1);
      console.log(`✅ Database connected! Found ${testQuery.length} project(s)`);
    } catch (dbError) {
      console.error('❌ Database connection FAILED!');
      console.error('Error:', dbError);
      if (dbError instanceof Error) {
        console.error('Message:', dbError.message);
        console.error('Stack:', dbError.stack);
      }
    }
  }

  // Start background sync jobs
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
    startAllSyncJobs();
  }
});
