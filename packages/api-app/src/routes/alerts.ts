import { Hono } from 'hono';
import { db, alerts, alertReads, eq, and, isNull, sql, desc } from '@repo/db';
import { logger } from '../utils/logger';
import { isUuid } from '../utils/project-access';

const log = logger.child('Alerts');
type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

// GET /api/alerts — list alerts with per-user read state
app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const { projectId, severity, type, unreadOnly, limit = '50', offset = '0' } = c.req.query();

    const VALID_TYPES = ['traffic_drop','ranking_drop','content_decay','anomaly','recommendation','correlated_drop','source_discrepancy'];
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions: any[] = [eq(alerts.workspaceId, workspaceId)];

    if (projectId && isUuid(projectId)) {
      conditions.push(eq(alerts.projectId, projectId));
    }
    if (severity && ['info', 'warning', 'critical'].includes(severity)) {
      conditions.push(eq(alerts.severity, severity as any));
    }
    if (type && VALID_TYPES.includes(type)) {
      conditions.push(eq(alerts.type, type as any));
    }
    if (unreadOnly === 'true') {
      conditions.push(isNull(alertReads.id));
    }

    const rows = await db
      .select({
        id: alerts.id,
        workspaceId: alerts.workspaceId,
        projectId: alerts.projectId,
        type: alerts.type,
        severity: alerts.severity,
        title: alerts.title,
        body: alerts.body,
        metadata: alerts.metadata,
        createdAt: alerts.createdAt,
        readAt: alertReads.readAt,
      })
      .from(alerts)
      .leftJoin(alertReads, and(
        eq(alertReads.alertId, alerts.id),
        eq(alertReads.userId, userId),
      ))
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .limit(parsedLimit)
      .offset(parsedOffset);

    const data = rows.map((r) => ({ ...r, isRead: r.readAt !== null }));

    return c.json({ success: true, data, count: data.length });
  } catch (err) {
    log.error('Error fetching alerts', err);
    return c.json({ success: false, error: 'Failed to fetch alerts' }, 500);
  }
});

// GET /api/alerts/count — per-user unread count (for notification bell)
app.get('/count', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');

    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(alerts)
      .leftJoin(alertReads, and(
        eq(alertReads.alertId, alerts.id),
        eq(alertReads.userId, userId),
      ))
      .where(and(
        eq(alerts.workspaceId, workspaceId),
        isNull(alertReads.id),
      ));

    return c.json({ success: true, data: { count: row?.count ?? 0 } });
  } catch (err) {
    log.error('Error fetching alert count', err);
    return c.json({ success: false, error: 'Failed to fetch count' }, 500);
  }
});

// PATCH /api/alerts/:id/read — mark single alert read (per-user)
app.patch('/:id/read', async (c) => {
  try {
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    const { id } = c.req.param();

    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid alert id' }, 400);

    // Verify alert belongs to workspace
    const [alert] = await db.select({ id: alerts.id })
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.workspaceId, workspaceId)))
      .limit(1);
    if (!alert) return c.json({ success: false, error: 'Alert not found' }, 404);

    await db.insert(alertReads).values({ alertId: id, userId }).onConflictDoNothing();

    return c.json({ success: true });
  } catch (err) {
    log.error('Error marking alert read', err);
    return c.json({ success: false, error: 'Failed to mark read' }, 500);
  }
});

// PATCH /api/alerts/read-all — mark all unread alerts read for current user
app.patch('/read-all', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');

    // Get unread alert IDs for this user (capped to prevent oversized bulk inserts)
    const READ_ALL_CAP = 500;
    const unreadRows = await db
      .select({ id: alerts.id })
      .from(alerts)
      .leftJoin(alertReads, and(
        eq(alertReads.alertId, alerts.id),
        eq(alertReads.userId, userId),
      ))
      .where(and(eq(alerts.workspaceId, workspaceId), isNull(alertReads.id)))
      .limit(READ_ALL_CAP);

    if (!unreadRows.length) return c.json({ success: true, data: { marked: 0 } });

    const reads = unreadRows.map((r) => ({ alertId: r.id, userId }));
    await db.insert(alertReads).values(reads).onConflictDoNothing();

    return c.json({ success: true, data: { marked: reads.length } });
  } catch (err) {
    log.error('Error marking all alerts read', err);
    return c.json({ success: false, error: 'Failed to mark all read' }, 500);
  }
});

// DELETE /api/alerts/:id — dismiss alert (hard delete)
app.delete('/:id', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const { id } = c.req.param();

    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid alert id' }, 400);

    const deleted = await db
      .delete(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.workspaceId, workspaceId)))
      .returning({ id: alerts.id });

    if (!deleted.length) return c.json({ success: false, error: 'Alert not found' }, 404);

    return c.json({ success: true });
  } catch (err) {
    log.error('Error deleting alert', err);
    return c.json({ success: false, error: 'Failed to delete alert' }, 500);
  }
});

export default app;
