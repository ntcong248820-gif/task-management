import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db, tasks, timeLogs, eq, and, sql, isNull } from '@repo/db';
import { logger } from '../utils/logger';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../schemas/task-schema';
import { projectBelongsToWorkspace, goalBelongsToWorkspace, sprintBelongsToWorkspace, isUuid } from '../utils/project-access';

const log = logger.child('Tasks');
type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

// GET /tasks/stats — must be before /:id
app.get('/stats', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const rows = await db.execute(
      sql`SELECT status, COUNT(*)::int AS count FROM tasks WHERE workspace_id = ${workspaceId} GROUP BY status`
    );
    const byStatus = Object.fromEntries((rows as any[]).map((r) => [r.status, r.count]));
    return c.json({ success: true, data: { byStatus } });
  } catch (error) {
    log.error('Error fetching task stats', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

// GET /tasks — list with filters + pagination
app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const { projectId, sprintId, assigneeId, status, search, limit = '50', offset = '0' } = c.req.query();

    const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'blocked', 'in_review', 'done'];
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions = [eq(tasks.workspaceId, workspaceId)];
    if (projectId && isUuid(projectId)) conditions.push(eq(tasks.projectId, projectId));
    if (sprintId && isUuid(sprintId)) conditions.push(eq(tasks.sprintId, sprintId));
    if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
    if (status && VALID_STATUSES.includes(status)) conditions.push(eq(tasks.status, status as any));
    if (search) conditions.push(sql`${tasks.title} ILIKE ${'%' + search + '%'}`);

    const allTasks = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .limit(parsedLimit)
      .offset(parsedOffset);

    return c.json({ success: true, data: allTasks, count: allTasks.length });
  } catch (error) {
    log.error('Error fetching tasks', error);
    return c.json({ success: false, error: 'Failed to fetch tasks' }, 500);
  }
});

// POST /tasks
app.post('/', zValidator('json', createTaskSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    if (!(await projectBelongsToWorkspace(body.projectId, workspaceId)))
      return c.json({ success: false, error: 'Project not found' }, 404);
    if (body.goalId && !(await goalBelongsToWorkspace(body.goalId, workspaceId)))
      return c.json({ success: false, error: 'Goal not found' }, 404);
    if (body.sprintId && !(await sprintBelongsToWorkspace(body.sprintId, workspaceId)))
      return c.json({ success: false, error: 'Sprint not found' }, 404);

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId,
        reporterId: c.get('userId'),
        projectId: body.projectId,
        goalId: body.goalId ?? null,
        sprintId: body.sprintId ?? null,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        taskType: body.taskType ?? null,
        priority: body.priority,
        affectsWebsite: body.affectsWebsite,
        assigneeId: body.assigneeId ?? null,
        timeSpent: body.timeSpent ?? 0,
        estimatedTime: body.estimatedTime ?? null,
        startDate: body.startDate ?? null,
        dueDate: body.dueDate ?? null,
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
        isRecurring: body.isRecurring,
        recurringTemplateId: body.recurringTemplateId ?? null,
        recurringConfig: body.recurringConfig ?? null,
        tags: body.tags ?? null,
        notes: body.notes ?? null,
        targetUrl: body.targetUrl ?? null,
      })
      .returning();

    return c.json({ success: true, data: task, message: 'Task created' }, 201);
  } catch (error) {
    log.error('Error creating task', error);
    return c.json({ success: false, error: 'Failed to create task' }, 500);
  }
});

// GET /tasks/:id
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
      .limit(1);

    if (!task) return c.json({ success: false, error: 'Task not found' }, 404);
    return c.json({ success: true, data: task });
  } catch (error) {
    log.error('Error fetching task', error);
    return c.json({ success: false, error: 'Failed to fetch task' }, 500);
  }
});

// PUT /tasks/:id — full update
app.put('/:id', zValidator('json', updateTaskSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);
    if (!existing) return c.json({ success: false, error: 'Task not found' }, 404);

    if (body.projectId && !(await projectBelongsToWorkspace(body.projectId, workspaceId)))
      return c.json({ success: false, error: 'Project not found' }, 404);
    if (body.goalId && !(await goalBelongsToWorkspace(body.goalId, workspaceId)))
      return c.json({ success: false, error: 'Goal not found' }, 404);
    if (body.sprintId && !(await sprintBelongsToWorkspace(body.sprintId, workspaceId)))
      return c.json({ success: false, error: 'Sprint not found' }, 404);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    const scalarFields = [
      'projectId', 'goalId', 'sprintId', 'title', 'description', 'status', 'taskType',
      'priority', 'affectsWebsite', 'assigneeId', 'timeSpent', 'estimatedTime', 'startDate',
      'dueDate', 'isRecurring', 'recurringTemplateId', 'recurringConfig', 'tags', 'notes',
      'targetUrl', 'expectedImpactStart', 'expectedImpactEnd', 'actualImpact',
    ] as const;
    for (const f of scalarFields) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (body.completedAt !== undefined) {
      patch.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    const [updated] = await db
      .update(tasks)
      .set(patch as any)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: updated, message: 'Task updated' });
  } catch (error) {
    log.error('Error updating task', error);
    return c.json({ success: false, error: 'Failed to update task' }, 500);
  }
});

// DELETE /tasks/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
      .returning();

    if (!deleted) return c.json({ success: false, error: 'Task not found' }, 404);
    return c.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    log.error('Error deleting task', error);
    return c.json({ success: false, error: 'Failed to delete task' }, 500);
  }
});

// POST /tasks/:id/complete — mark done, auto-stop caller's active timer, increment timeSpent
app.post('/:id/complete', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid task ID' }, 400);
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const now = new Date();

    let updated: typeof tasks.$inferSelect | undefined;
    await db.transaction(async (tx) => {
      // Stop only the calling user's timer on this task
      const [activeLog] = await tx
        .select()
        .from(timeLogs)
        .where(and(eq(timeLogs.taskId, id), eq(timeLogs.userId, userId), isNull(timeLogs.endedAt)))
        .limit(1);

      if (activeLog) {
        const duration = Math.floor((now.getTime() - activeLog.startedAt.getTime()) / 1000);
        await tx.update(timeLogs).set({ endedAt: now, duration }).where(eq(timeLogs.id, activeLog.id));
        await tx.update(tasks).set({ timeSpent: sql`time_spent + ${duration}` }).where(eq(tasks.id, id));
      }

      const [row] = await tx
        .update(tasks)
        .set({ status: 'done', completedAt: now, updatedAt: now })
        .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
        .returning();
      updated = row;
    });

    if (!updated) return c.json({ success: false, error: 'Task not found' }, 404);
    return c.json({ success: true, data: updated, message: 'Task completed' });
  } catch (error) {
    log.error('Error completing task', error);
    return c.json({ success: false, error: 'Failed to complete task' }, 500);
  }
});

// PATCH /tasks/:id/move — drag-and-drop status change
app.patch('/:id/move', zValidator('json', moveTaskSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid task ID' }, 400);

    const { status } = c.req.valid('json');
    const patch: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status !== 'done') patch.completedAt = null;

    const [updated] = await db
      .update(tasks)
      .set(patch as any)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
      .returning();

    if (!updated) return c.json({ success: false, error: 'Task not found' }, 404);
    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error moving task', error);
    return c.json({ success: false, error: 'Failed to move task' }, 500);
  }
});

export default app;
