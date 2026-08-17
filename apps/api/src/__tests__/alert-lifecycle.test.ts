import { describe, it, expect, afterEach } from 'vitest';
import { Hono } from 'hono';
import { db, eq, alerts, tasks } from '@repo/db';
import alertRoutes from '@repo/api-app/src/routes/alerts';
import { TEST_WORKSPACE_ID, TEST_USER_ID, createTestProject, cleanupTestData } from './helpers';

async function createTestAlert(projectId: string, data?: Partial<typeof alerts.$inferInsert>) {
  const [alert] = await db.insert(alerts).values({
    workspaceId: TEST_WORKSPACE_ID,
    projectId,
    type: 'traffic_drop',
    severity: 'critical',
    title: 'Critical traffic drop detected',
    body: 'Clicks dropped 40% week over week',
    metadata: { page: '/pricing' },
    ...data,
  }).returning();
  return alert;
}

async function cleanupAlertData() {
  await db.delete(alerts).where(eq(alerts.workspaceId, TEST_WORKSPACE_ID));
}

type AppVariables = { userId: string; workspaceId: string };

function buildTestApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('workspaceId', TEST_WORKSPACE_ID);
    c.set('userId', TEST_USER_ID);
    await next();
  });
  app.route('/alerts', alertRoutes);
  return app;
}

describe('Alert lifecycle (Phase 5)', () => {
  afterEach(async () => {
    await cleanupAlertData();
    await cleanupTestData();
  });

  it('PATCH /:id/status accepted sets acceptedBy/acceptedAt', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id);
    const app = buildTestApp();

    const res = await app.request(`/alerts/${alert.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('accepted');
    expect(json.data.acceptedBy).toBe(TEST_USER_ID);
    expect(json.data.acceptedAt).not.toBeNull();
  });

  it('PATCH /:id/status returns 404 for alert in another workspace', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id, { workspaceId: 'other-workspace' });
    const app = buildTestApp();

    const res = await app.request(`/alerts/${alert.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    expect(res.status).toBe(404);

    await db.delete(alerts).where(eq(alerts.id, alert.id));
  });

  it('PATCH /:id/status dismissed sets dismissedBy/dismissedAt', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id);
    const app = buildTestApp();

    const res = await app.request(`/alerts/${alert.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('dismissed');
    expect(json.data.dismissedBy).toBe(TEST_USER_ID);
    expect(json.data.dismissedAt).not.toBeNull();
  });

  it('POST /:id/create-task creates task with mapped fields and links alert', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id, {
      type: 'traffic_drop',
      severity: 'critical',
      title: 'Critical traffic drop detected',
      body: 'Clicks dropped 40% week over week',
      metadata: { page: '/pricing' },
    });
    const app = buildTestApp();

    const res = await app.request(`/alerts/${alert.id}/create-task`, { method: 'POST' });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe('Critical traffic drop detected');
    expect(json.data.description).toBe('Clicks dropped 40% week over week');
    expect(json.data.priority).toBe('urgent');
    expect(json.data.tags).toEqual(['traffic_drop']);
    expect(json.data.projectId).toBe(project.id);
    expect(json.data.targetUrl).toBe('/pricing');

    const [updatedAlert] = await db.select().from(alerts).where(eq(alerts.id, alert.id)).limit(1);
    expect(updatedAlert.status).toBe('task_created');
    expect(updatedAlert.linkedTaskId).toBe(json.data.id);
  });

  it('POST /:id/create-task called twice does not create a duplicate task', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id);
    const app = buildTestApp();

    const res1 = await app.request(`/alerts/${alert.id}/create-task`, { method: 'POST' });
    expect(res1.status).toBe(201);
    const json1 = await res1.json();

    const res2 = await app.request(`/alerts/${alert.id}/create-task`, { method: 'POST' });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.data.id).toBe(json1.data.id);

    const taskRows = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
    expect(taskRows.length).toBe(1);
  });

  it('POST /:id/create-task for alert outside workspace returns 404', async () => {
    const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });
    const alert = await createTestAlert(project.id, { workspaceId: 'other-workspace' });
    const app = buildTestApp();

    const res = await app.request(`/alerts/${alert.id}/create-task`, { method: 'POST' });
    expect(res.status).toBe(404);

    await db.delete(alerts).where(eq(alerts.id, alert.id));
  });
});
