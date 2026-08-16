import { describe, it, expect, afterEach } from 'vitest';
import { Hono } from 'hono';
import { db, eq, gscData } from '@repo/db';
import analyticsRoutes from '@repo/api-app/src/routes/analytics';
import { TEST_WORKSPACE_ID, createTestProject, cleanupTestData } from './helpers';

async function cleanupProvenanceData(projectId: string) {
    await db.delete(gscData).where(eq(gscData.projectId, projectId));
}

type AppVariables = { workspaceId: string };

function buildTestApp() {
    const app = new Hono<{ Variables: AppVariables }>();
    app.use('*', async (c, next) => {
        c.set('workspaceId', TEST_WORKSPACE_ID);
        await next();
    });
    app.route('/analytics', analyticsRoutes);
    return app;
}

describe('Analytics API legacy-row exclusion (Phase 4)', () => {
    afterEach(async () => {
        await cleanupTestData();
    });

    it('excludes legacy NULL-provenance rows from /api/analytics/keywords response', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/legacy',
            query: 'legacy only keyword',
            country: 'all',
            device: 'all',
            siteUrl: null,
            clicks: 50,
            impressions: 500,
            ctr: '0.1',
            position: '3.0',
        });
        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/current',
            query: 'current keyword',
            country: 'all',
            device: 'all',
            siteUrl: 'sc-domain:example.com',
            clicks: 20,
            impressions: 200,
            ctr: '0.1',
            position: '5.0',
        });

        const app = buildTestApp();
        const res = await app.request(`/analytics/keywords?projectId=${project.id}&days=365`);
        expect(res.status).toBe(200);
        const json = await res.json();

        const queries = json.data.keywords.map((k: { query: string }) => k.query);
        expect(queries).toContain('current keyword');
        expect(queries).not.toContain('legacy only keyword');

        await cleanupProvenanceData(project.id);
    });

    it('excludes legacy NULL-provenance rows from /api/analytics/overview traffic totals', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/legacy',
            query: 'legacy',
            country: 'all',
            device: 'all',
            siteUrl: null,
            clicks: 9999,
            impressions: 9999,
            ctr: '0.1',
            position: '3.0',
        });
        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/current',
            query: 'current',
            country: 'all',
            device: 'all',
            siteUrl: 'sc-domain:example.com',
            clicks: 5,
            impressions: 50,
            ctr: '0.1',
            position: '5.0',
        });

        const app = buildTestApp();
        const res = await app.request(`/analytics/overview?projectId=${project.id}&days=365`);
        expect(res.status).toBe(200);
        const json = await res.json();

        const gscSeries = json.data.trafficTrend as Array<{ clicks: number; impressions: number }>;
        const totalClicks = gscSeries.reduce((sum, row) => sum + row.clicks, 0);
        expect(totalClicks).toBeLessThan(9999);

        await cleanupProvenanceData(project.id);
    });
});
