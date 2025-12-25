import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';
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
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

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
}, () => {
  console.log(`🚀 Hono API running on port ${port}`);

  // Start background sync jobs
  if (process.env.NODE_ENV === 'production') {
    startAllSyncJobs();
  }
});
