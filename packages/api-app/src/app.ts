import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
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

const app = new Hono().basePath('/api');

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
// Use the last segment of x-forwarded-for (real client IP appended last) to prevent spoofing.
const getClientIp = (c: any): string => {
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',').pop()!.trim();
    return c.req.header('cf-connecting-ip') ?? 'anonymous';
};
app.use('/integrations/*/sync', rateLimiter({
    windowMs: 60_000,
    limit: 5,
    keyGenerator: getClientIp,
}));
app.use('/integrations/*/authorize', rateLimiter({
    windowMs: 60_000,
    limit: 10,
    keyGenerator: getClientIp,
}));

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        message: 'SEO Impact OS API is running',
        timestamp: new Date().toISOString(),
    });
});

app.route('/projects', projectsRoutes);
app.route('/tasks', tasksRoutes);
app.route('/time-logs', timeLogsRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/correlation', correlationRoutes);
app.route('/rankings', rankingsRoutes);
app.route('/urls', urlsRoutes);
app.route('/diagnosis', diagnosisRoutes);
app.route('/keywords', keywordsRoutes);
app.route('/integrations', integrationsRoutes);
app.route('/integrations/gsc', gscRoutes);
app.route('/integrations/ga4', ga4Routes);

export { app };
