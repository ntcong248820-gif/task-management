import { Hono } from 'hono';
import { db, tasks, eq, type NewTask } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Tasks');

const app = new Hono();

// GET /api/tasks - List all tasks (with optional projectId filter)
app.get('/', async (c) => {
  try {
    const projectId = c.req.query('projectId');

    let allTasks;
    if (projectId) {
      const parsedProjectId = parseInt(projectId);
      if (isNaN(parsedProjectId)) {
        return c.json(
          {
            success: false,
            error: 'Invalid project ID',
          },
          400
        );
      }

      allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, parsedProjectId));
    } else {
      allTasks = await db.select().from(tasks);
    }

    return c.json({
      success: true,
      data: allTasks,
      count: allTasks.length,
    });
  } catch (error) {
    log.error('Error fetching tasks', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      500
    );
  }
});

// GET /api/tasks/:id - Get single task by ID
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid task ID',
        },
        400
      );
    }

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task.length) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: task[0],
    });
  } catch (error) {
    log.error('Error fetching task', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch task',
      },
      500
    );
  }
});

// POST /api/tasks - Create new task
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.title) {
      return c.json(
        {
          success: false,
          error: 'Task title is required',
        },
        400
      );
    }

    if (!body.projectId) {
      return c.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        400
      );
    }

    // Prepare task data
    const newTask: NewTask = {
      projectId: body.projectId,
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      taskType: body.taskType || null,
      priority: body.priority || 'medium',
      assignedTo: body.assignedTo || null,
      timeSpent: body.timeSpent || 0,
      estimatedTime: body.estimatedTime || null,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      expectedImpactStart: body.expectedImpactStart || null,
      expectedImpactEnd: body.expectedImpactEnd || null,
      actualImpact: body.actualImpact || null,
      tags: body.tags || null,
      notes: body.notes || null,
    };

    // Insert into database
    const result = await db
      .insert(tasks)
      .values(newTask)
      .returning();

    return c.json(
      {
        success: true,
        data: result[0],
        message: 'Task created successfully',
      },
      201
    );
  } catch (error) {
    log.error('Error creating task', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create task',
      },
      500
    );
  }
});

// PUT /api/tasks/:id - Update existing task
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid task ID',
        },
        400
      );
    }

    const body = await c.req.json();

    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existingTask.length) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    // Prepare update data (only include fields that are present)
    const updateData: Partial<NewTask> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.taskType !== undefined) updateData.taskType = body.taskType;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.timeSpent !== undefined) updateData.timeSpent = body.timeSpent;
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    if (body.expectedImpactStart !== undefined) updateData.expectedImpactStart = body.expectedImpactStart;
    if (body.expectedImpactEnd !== undefined) updateData.expectedImpactEnd = body.expectedImpactEnd;
    if (body.actualImpact !== undefined) updateData.actualImpact = body.actualImpact;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Update in database
    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    return c.json({
      success: true,
      data: result[0],
      message: 'Task updated successfully',
    });
  } catch (error) {
    log.error('Error updating task', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update task',
      },
      500
    );
  }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid task ID',
        },
        400
      );
    }

    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existingTask.length) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    // Delete from database (cascade will handle time_logs)
    await db
      .delete(tasks)
      .where(eq(tasks.id, id));

    return c.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    log.error('Error deleting task', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete task',
      },
      500
    );
  }
});

export default app;
