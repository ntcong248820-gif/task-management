import { Hono } from 'hono';
import { runGA4Sync } from '../../jobs/sync-ga4';

const app = new Hono();

app.post('/', async (c) => {
    const start = Date.now();
    try {
        const result = await runGA4Sync();
        return c.json({ ok: true, durationMs: Date.now() - start, synced: result.synced, errors: result.errors });
    } catch (err) {
        return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
    }
});

export default app;
