import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db, goals, sprints, tasks, eq, and, sql, desc, inArray } from '@repo/db';
import { logger } from '../utils/logger';
import { createGoalSchema, updateGoalSchema } from '../schemas/goal-schema';
import { isUuid, requireProjectInWorkspace, goalBelongsToWorkspace } from '../utils/project-access';

const log = logger.child('Goals');
type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

const VALID_STATUSES = ['active', 'completed', 'cancelled'] as const;

// Batch progress: 1 SQL for all goals (no N+1)
async function batchGoalProgress(goalIds: string[]) {
  if (!goalIds.length) return [];
  const rows = await db
    .select({
      goalId: tasks.goalId,
      tasksTotal: sql<number>`count(*)::int`,
      tasksDone: sql<number>`count(CASE WHEN ${tasks.status} = 'done' THEN 1 END)::int`,
    })
    .from(tasks)
    .where(inArray(tasks.goalId, goalIds))
    .groupBy(tasks.goalId);
  return rows;
}

// GET /goals
app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const { projectId, status } = c.req.query();

    const conditions = [eq(goals.workspaceId, workspaceId)];
    if (projectId && isUuid(projectId)) conditions.push(eq(goals.projectId, projectId));
    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      conditions.push(eq(goals.status, status as typeof VALID_STATUSES[number]));
    }

    const allGoals = await db
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));

    const progressRows = await batchGoalProgress(allGoals.map((g) => g.id));
    const progressMap = new Map(progressRows.map((r) => [r.goalId, r]));

    const data = allGoals.map((g) => {
      const p = progressMap.get(g.id);
      return {
        ...g,
        tasksTotal: p?.tasksTotal ?? 0,
        tasksDone: p?.tasksDone ?? 0,
      };
    });

    return c.json({ success: true, data, count: data.length });
  } catch (error) {
    log.error('Error fetching goals', error);
    return c.json({ success: false, error: 'Failed to fetch goals' }, 500);
  }
});

// POST /goals
app.post('/', zValidator('json', createGoalSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    const access = await requireProjectInWorkspace(body.projectId, workspaceId);
    if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

    const [goal] = await db.insert(goals).values({
      workspaceId,
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? null,
      type: body.type,
      targetMetric: body.targetMetric ?? null,
      targetValue: body.targetValue ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status ?? 'active',
      createdByUserId: c.get('userId'),
    }).returning();

    return c.json({ success: true, data: goal }, 201);
  } catch (error) {
    log.error('Error creating goal', error);
    return c.json({ success: false, error: 'Failed to create goal' }, 500);
  }
});

// GET /goals/:id
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid goal ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.workspaceId, workspaceId)))
      .limit(1);

    if (!goal) return c.json({ success: false, error: 'Goal not found' }, 404);

    const linkedSprints = await db
      .select()
      .from(sprints)
      .where(and(eq(sprints.goalId, id), eq(sprints.workspaceId, workspaceId)));

    const [progress] = await batchGoalProgress([id]);

    return c.json({
      success: true,
      data: {
        ...goal,
        sprints: linkedSprints,
        tasksTotal: progress?.tasksTotal ?? 0,
        tasksDone: progress?.tasksDone ?? 0,
      },
    });
  } catch (error) {
    log.error('Error fetching goal', error);
    return c.json({ success: false, error: 'Failed to fetch goal' }, 500);
  }
});

// PUT /goals/:id
app.put('/:id', zValidator('json', updateGoalSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid goal ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const body = c.req.valid('json');

    const [existing] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) return c.json({ success: false, error: 'Goal not found' }, 404);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.targetMetric !== undefined) updateData.targetMetric = body.targetMetric;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.status !== undefined) updateData.status = body.status;

    const [updated] = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error updating goal', error);
    return c.json({ success: false, error: 'Failed to update goal' }, 500);
  }
});

// DELETE /goals/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid goal ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const result = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.workspaceId, workspaceId)))
      .returning();

    if (!result.length) return c.json({ success: false, error: 'Goal not found' }, 404);

    return c.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    log.error('Error deleting goal', error);
    return c.json({ success: false, error: 'Failed to delete goal' }, 500);
  }
});

// GET /goals/:id/progress
app.get('/:id/progress', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid goal ID' }, 400);

    const workspaceId = c.get('workspaceId');
    if (!(await goalBelongsToWorkspace(id, workspaceId))) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }

    const [progress] = await batchGoalProgress([id]);
    return c.json({
      success: true,
      data: {
        tasksTotal: progress?.tasksTotal ?? 0,
        tasksDone: progress?.tasksDone ?? 0,
      },
    });
  } catch (error) {
    log.error('Error fetching goal progress', error);
    return c.json({ success: false, error: 'Failed to fetch progress' }, 500);
  }
});

export default app;
