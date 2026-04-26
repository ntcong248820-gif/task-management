import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'crypto';

if (!process.env.CRON_SECRET) {
    console.warn('[cron] CRON_SECRET env var not set — all /cron/* requests will return 401');
}

// Auth FIRST — before any DB access. Secret must match CRON_SECRET env var.
export const verifyCronSecret = createMiddleware(async (c, next) => {
    const secret = process.env.CRON_SECRET;
    const auth = c.req.header('authorization') ?? '';

    if (!secret) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(auth);
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!valid) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
});
