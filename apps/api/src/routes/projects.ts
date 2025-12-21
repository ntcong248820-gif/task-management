import { Hono } from 'hono';
import { db, projects, eq, type NewProject } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Projects');

const app = new Hono();

// GET /api/projects - List all projects
app.get('/', async (c) => {
  try {
    const allProjects = await db.select().from(projects);

    return c.json({
      success: true,
      data: allProjects,
      count: allProjects.length,
    });
  } catch (error) {
    log.error('Error fetching projects', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch projects',
      },
      500
    );
  }
});

// GET /api/projects/:id - Get single project by ID
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid project ID',
        },
        400
      );
    }

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project.length) {
      return c.json(
        {
          success: false,
          error: 'Project not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: project[0],
    });
  } catch (error) {
    log.error('Error fetching project', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch project',
      },
      500
    );
  }
});

// POST /api/projects - Create new project
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name) {
      return c.json(
        {
          success: false,
          error: 'Project name is required',
        },
        400
      );
    }

    // Prepare project data
    const newProject: NewProject = {
      name: body.name,
      client: body.client || null,
      domain: body.domain || null,
      status: body.status || 'active',
      description: body.description || null,
    };

    // Insert into database
    const result = await db
      .insert(projects)
      .values(newProject)
      .returning();

    return c.json(
      {
        success: true,
        data: result[0],
        message: 'Project created successfully',
      },
      201
    );
  } catch (error) {
    log.error('Error creating project', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create project',
      },
      500
    );
  }
});

// PUT /api/projects/:id - Update existing project
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid project ID',
        },
        400
      );
    }

    const body = await c.req.json();

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject.length) {
      return c.json(
        {
          success: false,
          error: 'Project not found',
        },
        404
      );
    }

    // Prepare update data (only include fields that are present)
    const updateData: Partial<NewProject> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.client !== undefined) updateData.client = body.client;
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.description !== undefined) updateData.description = body.description;

    // Update in database
    const result = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    return c.json({
      success: true,
      data: result[0],
      message: 'Project updated successfully',
    });
  } catch (error) {
    log.error('Error updating project', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update project',
      },
      500
    );
  }
});

// DELETE /api/projects/:id - Delete project
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid project ID',
        },
        400
      );
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject.length) {
      return c.json(
        {
          success: false,
          error: 'Project not found',
        },
        404
      );
    }

    // Delete from database (cascade will handle tasks and time_logs)
    await db
      .delete(projects)
      .where(eq(projects.id, id));

    return c.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    log.error('Error deleting project', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete project',
      },
      500
    );
  }
});

export default app;
