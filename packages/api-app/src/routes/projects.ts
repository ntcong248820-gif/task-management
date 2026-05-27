import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, projects, eq, and, type NewProject } from '@repo/db';
import { logger } from '../utils/logger';
import { createProjectSchema, updateProjectSchema } from '../schemas/project-schema';

const log = logger.child('Projects');
const uuidSchema = z.string().uuid();

type AppVariables = {
  userId: string;
  workspaceId: string;
};

const app = new Hono<{ Variables: AppVariables }>();

const getWorkspaceId = (c: { get: (key: 'workspaceId') => string }) => c.get('workspaceId');
const isUuid = (value: string) => uuidSchema.safeParse(value).success;

app.get('/', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c);
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    return c.json({ success: true, data: allProjects, count: allProjects.length });
  } catch (error) {
    log.error('Error fetching projects', error);
    return c.json({ success: false, error: 'Failed to fetch projects' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid project ID' }, 400);
    }

    const workspaceId = getWorkspaceId(c);
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (!project.length) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json({ success: true, data: project[0] });
  } catch (error) {
    log.error('Error fetching project', error);
    return c.json({ success: false, error: 'Failed to fetch project' }, 500);
  }
});

app.post('/', zValidator('json', createProjectSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const workspaceId = getWorkspaceId(c);

    const newProject: NewProject = {
      workspaceId,
      name: body.name,
      domain: body.domain ?? null,
      description: body.description ?? null,
      color: body.color ?? null,
      isActive: body.isActive,
    };

    const result = await db.insert(projects).values(newProject).returning();

    return c.json({ success: true, data: result[0], message: 'Project created successfully' }, 201);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    // Check for unique constraint violation (domain already exists in workspace)
    if (errorMsg.includes('unique') || errorMsg.includes('23505')) {
      log.warn('Duplicate domain on create', { error: errorMsg });
      return c.json({ success: false, error: 'Domain already used in this workspace' }, 409);
    }
    log.error('Error creating project', error);
    return c.json({ success: false, error: 'Failed to create project' }, 500);
  }
});

app.put('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const id = c.req.param('id');
  try {
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid project ID' }, 400);
    }

    const body = c.req.valid('json');
    const workspaceId = getWorkspaceId(c);

    const existingProject = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (!existingProject.length) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const updateData: Partial<NewProject> & { updatedAt: Date } = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const result = await db
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
      .returning();

    return c.json({ success: true, data: result[0], message: 'Project updated successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '';
    // Check for unique constraint violation (domain already exists in workspace)
    if (errorMsg.includes('unique') || errorMsg.includes('23505')) {
      log.warn('Duplicate domain on update', { projectId: id, error: errorMsg });
      return c.json({ success: false, error: 'Domain already used in this workspace' }, 409);
    }
    log.error('Error updating project', error);
    return c.json({ success: false, error: 'Failed to update project' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ success: false, error: 'Invalid project ID' }, 400);
    }

    const workspaceId = getWorkspaceId(c);
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
      .returning();

    if (!result.length) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    return c.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    log.error('Error deleting project', error);
    return c.json({ success: false, error: 'Failed to delete project' }, 500);
  }
});

export default app;
