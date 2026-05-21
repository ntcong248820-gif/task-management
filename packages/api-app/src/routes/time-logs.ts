import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, timeLogs, tasks, eq, and, desc, isNull, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('TimeLogs');
const uuidSchema = z.string().uuid();
const isUuid = (value: string) => uuidSchema.safeParse(value).success;

type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

// POST /time-logs/start — DB-backed timer start
app.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    const { taskId } = body;
    if (!taskId || !isUuid(taskId))
      return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');

    // Reject if this user already has an active timer
    const [active] = await db
      .select({ id: timeLogs.id, taskId: timeLogs.taskId })
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), isNull(timeLogs.endedAt)))
      .limit(1);

    if (active) {
      return c.json(
        { success: false, error: 'Another timer is already active', data: { activeTaskId: active.taskId } },
        409
      );
    }

    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!task) return c.json({ success: false, error: 'Task not found' }, 404);

    const [newLog] = await db
      .insert(timeLogs)
      .values({ taskId, workspaceId, userId, startedAt: new Date() })
      .returning();

    return c.json({ success: true, data: newLog, message: 'Timer started' }, 201);
  } catch (error) {
    log.error('Error starting timer', error);
    return c.json({ success: false, error: 'Failed to start timer' }, 500);
  }
});

// POST /time-logs/stop — stop active timer, update timeSpent on task
app.post('/stop', async (c) => {
  try {
    const userId = c.get('userId');
    const workspaceId = c.get('workspaceId');
    const body = await c.req.json().catch(() => ({}));

    const [active] = await db
      .select()
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.workspaceId, workspaceId), isNull(timeLogs.endedAt)))
      .limit(1);

    if (!active) return c.json({ success: false, error: 'No active timer found' }, 404);

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000);

    const [stoppedLog] = await db
      .update(timeLogs)
      .set({ endedAt, duration, note: body.note ?? null })
      .where(eq(timeLogs.id, active.id))
      .returning();

    await db
      .update(tasks)
      .set({ timeSpent: sql`time_spent + ${duration}`, updatedAt: new Date() })
      .where(eq(tasks.id, active.taskId));

    return c.json({ success: true, data: stoppedLog, message: 'Timer stopped' });
  } catch (error) {
    log.error('Error stopping timer', error);
    return c.json({ success: false, error: 'Failed to stop timer' }, 500);
  }
});

// GET /time-logs — list (filter by taskId)
app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const taskId = c.req.query('taskId');

    if (taskId && !isUuid(taskId))
      return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const where = taskId
      ? and(eq(timeLogs.workspaceId, workspaceId), eq(timeLogs.taskId, taskId))
      : eq(timeLogs.workspaceId, workspaceId);

    const logs = await db.select().from(timeLogs).where(where).orderBy(desc(timeLogs.startedAt));
    return c.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    log.error('Error fetching time logs', error);
    return c.json({ success: false, error: 'Failed to fetch time logs' }, 500);
  }
});

const manualLogSchema = z.object({
  taskId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  duration: z.number().int().positive(),
  note: z.string().max(500).nullable().optional(),
});

// POST /time-logs — manual log entry (full start/end/duration)
app.post('/', zValidator('json', manualLogSchema), async (c) => {
  try {
    const { taskId, startedAt, endedAt, duration, note } = c.req.valid('json');

    const workspaceId = c.get('workspaceId');
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!task) return c.json({ success: false, error: 'Task not found' }, 404);

    const [newLog] = await db
      .insert(timeLogs)
      .values({
        taskId,
        workspaceId,
        userId: c.get('userId'),
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        duration,
        note: note ?? null,
      })
      .returning();

    return c.json({ success: true, data: newLog, message: 'Time log created' });
  } catch (error) {
    log.error('Error creating time log', error);
    return c.json({ success: false, error: 'Failed to create time log' }, 500);
  }
});

// DELETE /time-logs/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid time log ID' }, 400);

    const [deleted] = await db
      .delete(timeLogs)
      .where(and(eq(timeLogs.id, id), eq(timeLogs.workspaceId, c.get('workspaceId'))))
      .returning();

    if (!deleted) return c.json({ success: false, error: 'Time log not found' }, 404);
    return c.json({ success: true, data: deleted, message: 'Time log deleted' });
  } catch (error) {
    log.error('Error deleting time log', error);
    return c.json({ success: false, error: 'Failed to delete time log' }, 500);
  }
});

export default app;
