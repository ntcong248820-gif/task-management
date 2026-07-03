import { Hono } from 'hono';
import { runGA4Sync } from '../../jobs/sync-ga4';

const app = new Hono();

app.post('/', async (c) => {
    const start = Date.now();
    try {
        const result = await runGA4Sync();
        const body = { ok: result.errors.length === 0, durationMs: Date.now() - start, synced: result.synced, errors: result.errors };
        if (!body.ok) return c.json(body, 500);
        return c.json(body);
    } catch (err) {
        return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
    }
});

export default app;
