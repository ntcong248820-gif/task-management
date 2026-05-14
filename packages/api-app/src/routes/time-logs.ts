import { Hono } from 'hono';
import { z } from 'zod';
import { db, timeLogs, tasks, eq, and, desc } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('TimeLogs');
const uuidSchema = z.string().uuid();

type AppVariables = {
  userId: string;
  workspaceId: string;
};

const app = new Hono<{ Variables: AppVariables }>();

const isUuid = (value: string) => uuidSchema.safeParse(value).success;

app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const taskId = c.req.query('taskId');

    if (taskId && !isUuid(taskId)) {
      return c.json({ success: false, error: 'Invalid task ID' }, 400);
    }

    const where = taskId
      ? and(eq(timeLogs.workspaceId, workspaceId), eq(timeLogs.taskId, taskId))
      : eq(timeLogs.workspaceId, workspaceId);

    const logs = await db
      .select()
      .from(timeLogs)
      .where(where)
      .orderBy(desc(timeLogs.startedAt));

    return c.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    log.error('Error fetching time logs', error);
    return c.json({ success: false, error: 'Failed to fetch time logs' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const taskId = body.taskId;
    const startedAt = body.startedAt ?? body.startTime;
    const endedAt = body.endedAt ?? body.endTime;
    const duration = body.duration;

    if (!taskId || !startedAt || !endedAt || !duration) {
      return c.json({
        success: false,
        error: 'Missing required fields: taskId, startedAt, endedAt, duration',
      }, 400);
    }

    if (!isUuid(taskId)) {
      return c.json({ success: false, error: 'Invalid task ID' }, 400);
    }

    const workspaceId = c.get('workspaceId');
    const existingTask = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .limit(1);

    if (!existingTask.length) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    const [newLog] = await db
      .insert(timeLogs)
      .values({
        taskId,
        workspaceId,
        userId: c.get('userId'),
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        duration: Number(duration),
        note: body.note ?? body.notes ?? null,
      })
      .returning();

    return c.json({ success: true, data: newLog, message: 'Time log created successfully' });
  } catch (error) {
    log.error('Error creating time log', error);
    return c.json({ success: false, error: 'Failed to create time log' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid time log ID' }, 400);
    }

    const [deletedLog] = await db
      .delete(timeLogs)
      .where(and(eq(timeLogs.id, id), eq(timeLogs.workspaceId, c.get('workspaceId'))))
      .returning();

    if (!deletedLog) {
      return c.json({ success: false, error: 'Time log not found' }, 404);
    }

    return c.json({ success: true, data: deletedLog, message: 'Time log deleted successfully' });
  } catch (error) {
    log.error('Error deleting time log', error);
    return c.json({ success: false, error: 'Failed to delete time log' }, 500);
  }
});

export default app;
