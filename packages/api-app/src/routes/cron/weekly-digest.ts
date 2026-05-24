import { Hono } from 'hono';
import { db, sql } from '@repo/db';
import { generateWeeklyDigest } from '../../jobs/weekly-digest';
import { logger } from '../../utils/logger';

const log = logger.child('Cron:WeeklyDigest');
const app = new Hono();

app.post('/', async (c) => {
  const start = Date.now();
  const ran: string[] = [];
  const errors: string[] = [];

  try {
    // Get all distinct workspace IDs from projects
    const rows = await db.execute(sql`SELECT DISTINCT workspace_id FROM projects`);
    const workspaceIds = (rows as unknown as Array<{ workspace_id: string }>).map((r) => r.workspace_id);

    log.info(`Generating weekly digest for ${workspaceIds.length} workspaces...`);

    for (const workspaceId of workspaceIds) {
      try {
        await generateWeeklyDigest(workspaceId);
        ran.push(workspaceId);
      } catch (err: any) {
        errors.push(`${workspaceId}: ${err.message}`);
        log.error(`Weekly digest failed for workspace ${workspaceId}`, err);
      }
    }

    return c.json({ ok: true, ran: ran.length, errors, durationMs: Date.now() - start });
  } catch (err: any) {
    log.error('Cron weekly-digest failed', err);
    return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
  }
});

export default app;
