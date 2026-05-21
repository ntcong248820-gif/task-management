import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { rateLimiter } from 'hono-rate-limiter';
import { auth } from '@repo/auth-config';
import { validateEnv } from './utils/validate-env';
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
import taskTemplatesRoutes from './routes/task-templates';
import cronRoutes from './routes/cron/index';

validateEnv();

type AuthSession = typeof auth.$Infer.Session;

type AppVariables = {
    user: AuthSession['user'];
    session: AuthSession['session'];
    userId: string;
    workspaceId: string;
};

const previewOrigins = (process.env.FRONTEND_URL_PREVIEW ?? '').split(',').map(s => s.trim()).filter(Boolean);
const corsOrigins = [
    'http://localhost:3002',
    process.env.FRONTEND_URL,
    ...previewOrigins,
].filter(Boolean) as string[];

const app = new Hono<{ Variables: AppVariables }>().basePath('/api');

app.use('*', cors({
    origin: corsOrigins,
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

const getApiPath = (url: string): string => {
    const pathname = new URL(url).pathname;
    return pathname.replace(/^\/api(?=\/|$)/, '') || '/';
};

const isPublicApiPath = (path: string): boolean => {
    return (
        path === '/health' ||
        path === '/auth' ||
        path.startsWith('/auth/') ||
        path === '/cron' ||
        path.startsWith('/cron/') ||
        path === '/integrations/gsc/callback' ||
        path === '/integrations/ga4/callback'
    );
};

app.use('*', async (c, next) => {
    if (isPublicApiPath(getApiPath(c.req.url))) {
        await next();
        return;
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const workspaceId = session.session.activeOrganizationId;
    if (!workspaceId) {
        return c.json({ success: false, error: 'No workspace selected' }, 403);
    }

    c.set('user', session.user);
    c.set('session', session.session);
    c.set('userId', session.user.id);
    c.set('workspaceId', workspaceId);
    await next();
});

app.route('/task-templates', taskTemplatesRoutes);
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
app.route('/cron', cronRoutes);

export { app };
