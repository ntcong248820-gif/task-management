import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db, sprints, tasks, eq, and, desc } from '@repo/db';
import { logger } from '../utils/logger';
import { createSprintSchema, updateSprintSchema } from '../schemas/goal-schema';
import { isUuid, projectBelongsToWorkspace, sprintBelongsToWorkspace, getGoalProjectId } from '../utils/project-access';

const log = logger.child('Sprints');
type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

const VALID_STATUSES = ['planning', 'active', 'completed'] as const;

// GET /sprints
app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const { goalId, projectId, status } = c.req.query();

    const conditions = [eq(sprints.workspaceId, workspaceId)];
    if (goalId && isUuid(goalId)) conditions.push(eq(sprints.goalId, goalId));
    if (projectId && isUuid(projectId)) conditions.push(eq(sprints.projectId, projectId));
    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      conditions.push(eq(sprints.status, status as typeof VALID_STATUSES[number]));
    }

    const allSprints = await db
      .select()
      .from(sprints)
      .where(and(...conditions))
      .orderBy(desc(sprints.createdAt));

    return c.json({ success: true, data: allSprints, count: allSprints.length });
  } catch (error) {
    log.error('Error fetching sprints', error);
    return c.json({ success: false, error: 'Failed to fetch sprints' }, 500);
  }
});

// POST /sprints
app.post('/', zValidator('json', createSprintSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    let projectId = body.projectId ?? null;

    if (body.goalId) {
      const goalProjectId = await getGoalProjectId(body.goalId, workspaceId);
      if (!goalProjectId) {
        return c.json({ success: false, error: 'Goal not found' }, 404);
      }
      if (projectId && projectId !== goalProjectId) {
        return c.json({ success: false, error: 'Goal does not belong to project' }, 400);
      }
      projectId = goalProjectId;
    }

    if (projectId && !(await projectBelongsToWorkspace(projectId, workspaceId))) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const [sprint] = await db.insert(sprints).values({
      workspaceId,
      projectId,
      goalId: body.goalId ?? null,
      name: body.name,
      description: body.description ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status ?? 'planning',
    }).returning();

    return c.json({ success: true, data: sprint }, 201);
  } catch (error) {
    log.error('Error creating sprint', error);
    return c.json({ success: false, error: 'Failed to create sprint' }, 500);
  }
});

// PUT /sprints/:id
app.put('/:id', zValidator('json', updateSprintSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid sprint ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const body = c.req.valid('json');

    const [existing] = await db
      .select({ id: sprints.id, projectId: sprints.projectId, goalId: sprints.goalId })
      .from(sprints)
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) return c.json({ success: false, error: 'Sprint not found' }, 404);

    let nextProjectId = body.projectId !== undefined ? body.projectId : existing.projectId;
    const nextGoalId = body.goalId !== undefined ? body.goalId : existing.goalId;

    if (nextGoalId) {
      const goalProjectId = await getGoalProjectId(nextGoalId, workspaceId);
      if (!goalProjectId) {
        return c.json({ success: false, error: 'Goal not found' }, 404);
      }
      if (nextProjectId && nextProjectId !== goalProjectId) {
        return c.json({ success: false, error: 'Goal does not belong to project' }, 400);
      }
      nextProjectId = goalProjectId;
    }

    if (nextProjectId && !(await projectBelongsToWorkspace(nextProjectId, workspaceId))) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.goalId !== undefined) updateData.goalId = body.goalId;
    if (body.projectId !== undefined || nextProjectId !== existing.projectId) updateData.projectId = nextProjectId;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;

    const [updated] = await db
      .update(sprints)
      .set(updateData)
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error updating sprint', error);
    return c.json({ success: false, error: 'Failed to update sprint' }, 500);
  }
});

// DELETE /sprints/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid sprint ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const result = await db
      .delete(sprints)
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .returning();

    if (!result.length) return c.json({ success: false, error: 'Sprint not found' }, 404);

    return c.json({ success: true, message: 'Sprint deleted' });
  } catch (error) {
    log.error('Error deleting sprint', error);
    return c.json({ success: false, error: 'Failed to delete sprint' }, 500);
  }
});

// POST /sprints/:id/start
app.post('/:id/start', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid sprint ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const [existing] = await db
      .select({ id: sprints.id, status: sprints.status })
      .from(sprints)
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) return c.json({ success: false, error: 'Sprint not found' }, 404);
    if (existing.status !== 'planning') {
      return c.json({ success: false, error: `Cannot start sprint in '${existing.status}' status` }, 409);
    }

    const today = new Date().toISOString().slice(0, 10);
    const [updated] = await db
      .update(sprints)
      .set({ status: 'active', startDate: today, updatedAt: new Date() })
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error starting sprint', error);
    return c.json({ success: false, error: 'Failed to start sprint' }, 500);
  }
});

// POST /sprints/:id/complete
app.post('/:id/complete', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid sprint ID' }, 400);

    const workspaceId = c.get('workspaceId');
    const [existing] = await db
      .select({ id: sprints.id, status: sprints.status })
      .from(sprints)
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) return c.json({ success: false, error: 'Sprint not found' }, 404);
    if (existing.status !== 'active') {
      return c.json({ success: false, error: `Cannot complete sprint in '${existing.status}' status` }, 409);
    }

    const today = new Date().toISOString().slice(0, 10);
    const [updated] = await db
      .update(sprints)
      .set({ status: 'completed', endDate: today, updatedAt: new Date() })
      .where(and(eq(sprints.id, id), eq(sprints.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error completing sprint', error);
    return c.json({ success: false, error: 'Failed to complete sprint' }, 500);
  }
});

// GET /sprints/:id/tasks
app.get('/:id/tasks', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid sprint ID' }, 400);

    const workspaceId = c.get('workspaceId');
    if (!(await sprintBelongsToWorkspace(id, workspaceId))) {
      return c.json({ success: false, error: 'Sprint not found' }, 404);
    }

    const sprintTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sprintId, id), eq(tasks.workspaceId, workspaceId)));

    return c.json({ success: true, data: sprintTasks, count: sprintTasks.length });
  } catch (error) {
    log.error('Error fetching sprint tasks', error);
    return c.json({ success: false, error: 'Failed to fetch sprint tasks' }, 500);
  }
});

export default app;
