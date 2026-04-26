import { Hono } from 'hono';
import { runGSCSync } from '../../jobs/sync-gsc';

const app = new Hono();

app.post('/', async (c) => {
    const start = Date.now();
    try {
        await runGSCSync();
    } catch (err) {
        return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
    }
    return c.json({ ok: true, durationMs: Date.now() - start });
});

export default app;
