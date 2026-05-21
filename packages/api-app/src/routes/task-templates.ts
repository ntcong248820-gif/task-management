import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, taskTemplates, tasks, eq, and } from '@repo/db';
import { logger } from '../utils/logger';
import { createTaskTemplateSchema } from '../schemas/task-schema';
import { isUuid, projectBelongsToWorkspace } from '../utils/project-access';

const log = logger.child('TaskTemplates');
type AppVariables = { userId: string; workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

// GET /task-templates — list workspace templates
app.get('/', async (c) => {
  try {
    const all = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.workspaceId, c.get('workspaceId')));
    return c.json({ success: true, data: all });
  } catch (error) {
    log.error('Error fetching templates', error);
    return c.json({ success: false, error: 'Failed to fetch templates' }, 500);
  }
});

// POST /task-templates — create template
app.post('/', zValidator('json', createTaskTemplateSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const [template] = await db
      .insert(taskTemplates)
      .values({
        workspaceId: c.get('workspaceId'),
        title: body.title,
        description: body.description ?? null,
        taskType: body.taskType ?? null,
        priority: body.priority,
        affectsWebsite: body.affectsWebsite,
        estimatedTime: body.estimatedTime ?? null,
        recurringConfig: body.recurringConfig,
        tags: body.tags ?? null,
      })
      .returning();
    return c.json({ success: true, data: template, message: 'Template created' }, 201);
  } catch (error) {
    log.error('Error creating template', error);
    return c.json({ success: false, error: 'Failed to create template' }, 500);
  }
});

const patchTemplateSchema = z.object({ isActive: z.boolean() });

// PATCH /task-templates/:id — toggle isActive
app.patch('/:id', zValidator('json', patchTemplateSchema), async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid template ID' }, 400);
    const { isActive } = c.req.valid('json');
    const [updated] = await db
      .update(taskTemplates)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.workspaceId, c.get('workspaceId'))))
      .returning();
    if (!updated) return c.json({ success: false, error: 'Template not found' }, 404);
    return c.json({ success: true, data: updated });
  } catch (error) {
    log.error('Error updating template', error);
    return c.json({ success: false, error: 'Failed to update template' }, 500);
  }
});

// DELETE /task-templates/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ success: false, error: 'Invalid template ID' }, 400);
    const [deleted] = await db
      .delete(taskTemplates)
      .where(and(eq(taskTemplates.id, id), eq(taskTemplates.workspaceId, c.get('workspaceId'))))
      .returning();
    if (!deleted) return c.json({ success: false, error: 'Template not found' }, 404);
    return c.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    log.error('Error deleting template', error);
    return c.json({ success: false, error: 'Failed to delete template' }, 500);
  }
});

// POST /task-templates/:id/spawn — idempotent task spawn for today
const spawnSchema = z.object({
  projectId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

app.post('/:id/spawn', zValidator('json', spawnSchema), async (c) => {
  try {
    const templateId = c.req.param('id');
    if (!isUuid(templateId)) return c.json({ success: false, error: 'Invalid template ID' }, 400);

    const { projectId, startDate } = c.req.valid('json');
    const workspaceId = c.get('workspaceId');

    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(and(eq(taskTemplates.id, templateId), eq(taskTemplates.workspaceId, workspaceId)))
      .limit(1);
    if (!template) return c.json({ success: false, error: 'Template not found' }, 404);

    if (!(await projectBelongsToWorkspace(projectId, workspaceId)))
      return c.json({ success: false, error: 'Project not found' }, 404);

    const today = startDate ?? new Date().toISOString().slice(0, 10);

    const [spawned] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId,
        reporterId: c.get('userId'),
        title: template.title,
        description: template.description ?? null,
        taskType: template.taskType ?? null,
        priority: template.priority as any,
        affectsWebsite: template.affectsWebsite,
        estimatedTime: template.estimatedTime ?? null,
        tags: template.tags ?? null,
        isRecurring: true,
        recurringTemplateId: template.id,
        startDate: today,
      })
      .onConflictDoNothing()
      .returning();

    return c.json({ success: true, data: spawned ?? null, message: spawned ? 'Task spawned' : 'Already exists' });
  } catch (error) {
    log.error('Error spawning template task', error);
    return c.json({ success: false, error: 'Failed to spawn task' }, 500);
  }
});

export default app;
