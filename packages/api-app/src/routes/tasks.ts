import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db, tasks, eq, and, type NewTask } from '@repo/db';
import { logger } from '../utils/logger';
import { createTaskSchema, updateTaskSchema } from '../schemas/task-schema';
import { goalBelongsToWorkspace, isUuid, projectBelongsToWorkspace, sprintBelongsToWorkspace } from '../utils/project-access';

const log = logger.child('Tasks');

type AppVariables = {
  userId: string;
  workspaceId: string;
};

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const projectId = c.req.query('projectId');

    if (projectId && !isUuid(projectId)) {
      return c.json({ success: false, error: 'Invalid project ID' }, 400);
    }

    const where = projectId
      ? and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, projectId))
      : eq(tasks.workspaceId, workspaceId);

    const allTasks = await db.select().from(tasks).where(where);

    return c.json({ success: true, data: allTasks, count: allTasks.length });
  } catch (error) {
    log.error('Error fetching tasks', error);
    return c.json({ success: false, error: 'Failed to fetch tasks' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid task ID' }, 400);
    }

    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
      .limit(1);

    if (!task.length) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json({ success: true, data: task[0] });
  } catch (error) {
    log.error('Error fetching task', error);
    return c.json({ success: false, error: 'Failed to fetch task' }, 500);
  }
});

app.post('/', zValidator('json', createTaskSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    if (!(await projectBelongsToWorkspace(body.projectId, workspaceId))) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }
    if (body.goalId && !(await goalBelongsToWorkspace(body.goalId, workspaceId))) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }
    if (body.sprintId && !(await sprintBelongsToWorkspace(body.sprintId, workspaceId))) {
      return c.json({ success: false, error: 'Sprint not found' }, 404);
    }

    const newTask: NewTask = {
      workspaceId,
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
      reporterId: c.get('userId'),
      timeSpent: body.timeSpent ?? 0,
      estimatedTime: body.estimatedTime ?? null,
      startDate: body.startDate ?? null,
      dueDate: body.dueDate ?? null,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      expectedImpactStart: body.expectedImpactStart ?? null,
      expectedImpactEnd: body.expectedImpactEnd ?? null,
      actualImpact: body.actualImpact ?? null,
      isRecurring: body.isRecurring,
      recurringTemplateId: body.recurringTemplateId ?? null,
      recurringConfig: body.recurringConfig ?? null,
      tags: body.tags ?? null,
      notes: body.notes ?? null,
    };

    const result = await db.insert(tasks).values(newTask).returning();

    return c.json({ success: true, data: result[0], message: 'Task created successfully' }, 201);
  } catch (error) {
    log.error('Error creating task', error);
    return c.json({ success: false, error: 'Failed to create task' }, 500);
  }
});

app.put('/:id', zValidator('json', updateTaskSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid task ID' }, 400);
    }

    const body = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    const existingTask = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .limit(1);

    if (!existingTask.length) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    if (body.projectId && !(await projectBelongsToWorkspace(body.projectId, workspaceId))) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }
    if (body.goalId && !(await goalBelongsToWorkspace(body.goalId, workspaceId))) {
      return c.json({ success: false, error: 'Goal not found' }, 404);
    }
    if (body.sprintId && !(await sprintBelongsToWorkspace(body.sprintId, workspaceId))) {
      return c.json({ success: false, error: 'Sprint not found' }, 404);
    }

    const updateData: Partial<NewTask> & { updatedAt: Date } = { updatedAt: new Date() };

    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.goalId !== undefined) updateData.goalId = body.goalId;
    if (body.sprintId !== undefined) updateData.sprintId = body.sprintId;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.affectsWebsite !== undefined) updateData.affectsWebsite = body.affectsWebsite;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.timeSpent !== undefined) updateData.timeSpent = body.timeSpent;
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    if (body.expectedImpactStart !== undefined) updateData.expectedImpactStart = body.expectedImpactStart;
    if (body.expectedImpactEnd !== undefined) updateData.expectedImpactEnd = body.expectedImpactEnd;
    if (body.actualImpact !== undefined) updateData.actualImpact = body.actualImpact;
    if (body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring;
    if (body.recurringTemplateId !== undefined) updateData.recurringTemplateId = body.recurringTemplateId;
    if (body.recurringConfig !== undefined) updateData.recurringConfig = body.recurringConfig;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const result = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: result[0], message: 'Task updated successfully' });
  } catch (error) {
    log.error('Error updating task', error);
    return c.json({ success: false, error: 'Failed to update task' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid task ID' }, 400);
    }

    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, c.get('workspaceId'))))
      .returning();

    if (!result.length) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    log.error('Error deleting task', error);
    return c.json({ success: false, error: 'Failed to delete task' }, 500);
  }
});

export default app;
