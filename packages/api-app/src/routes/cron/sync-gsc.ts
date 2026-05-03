import { Hono } from 'hono';
import { runGSCSync } from '../../jobs/sync-gsc';

const app = new Hono();

app.post('/', async (c) => {
    const start = Date.now();
    try {
        const result = await runGSCSync();
        return c.json({ ok: true, durationMs: Date.now() - start, synced: result.synced, errors: result.errors });
    } catch (err) {
        return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
    }
});

export default app;
