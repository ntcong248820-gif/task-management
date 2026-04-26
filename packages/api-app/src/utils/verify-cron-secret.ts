import { createMiddleware } from 'hono/factory';

if (!process.env.CRON_SECRET) {
    console.warn('[cron] CRON_SECRET env var not set — all /cron/* requests will return 401');
}

// Auth FIRST — before any DB access. Secret must match CRON_SECRET env var.
export const verifyCronSecret = createMiddleware(async (c, next) => {
    const auth = c.req.header('authorization');
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});
