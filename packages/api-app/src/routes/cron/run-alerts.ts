import { Hono } from 'hono';
import { db, projects, gscConnections, eq } from '@repo/db';
import { runAlertEngine } from '../../jobs/alert-engine';
import { logger } from '../../utils/logger';

const log = logger.child('Cron:Alerts');
const app = new Hono();

app.post('/', async (c) => {
  const start = Date.now();
  const ran: string[] = [];
  const errors: string[] = [];

  try {
    // Get all projects that have GSC connections (alert engine requires GSC data)
    const connections = await db
      .select({
        projectId: gscConnections.projectId,
        workspaceId: projects.workspaceId,
      })
      .from(gscConnections)
      .innerJoin(projects, eq(projects.id, gscConnections.projectId));

    log.info(`Running alert engine for ${connections.length} projects...`);

    for (const conn of connections) {
      try {
        await runAlertEngine(conn.workspaceId, conn.projectId);
        ran.push(conn.projectId);
      } catch (err: any) {
        errors.push(`${conn.projectId}: ${err.message}`);
        log.error(`Alert engine failed for project ${conn.projectId}`, err);
      }
    }

    return c.json({ ok: true, ran: ran.length, errors, durationMs: Date.now() - start });
  } catch (err: any) {
    log.error('Cron run-alerts failed', err);
    return c.json({ ok: false, error: String(err), durationMs: Date.now() - start }, 500);
  }
});

export default app;
