import { describe, it, expect, afterEach } from 'vitest';
import { db, eq, and, gscConnections, ga4Connections, gscData, gscDataAggregated, ga4Data } from '@repo/db';
import { TEST_WORKSPACE_ID, createTestProject, cleanupTestData } from './helpers';

async function cleanupConnections(projectId: string) {
    await db.delete(gscConnections).where(eq(gscConnections.projectId, projectId));
    await db.delete(ga4Connections).where(eq(ga4Connections.projectId, projectId));
    await db.delete(gscData).where(eq(gscData.projectId, projectId));
    await db.delete(gscDataAggregated).where(eq(gscDataAggregated.projectId, projectId));
    await db.delete(ga4Data).where(eq(ga4Data.projectId, projectId));
}

const baseGscConnection = {
    workspaceId: TEST_WORKSPACE_ID,
    authorizedByUserId: 'test-user-id',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
};

const baseGa4Connection = {
    workspaceId: TEST_WORKSPACE_ID,
    authorizedByUserId: 'test-user-id',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
};

describe('Sync health & source management (Phase 3)', () => {
    afterEach(async () => {
        await cleanupTestData();
    });

    it('enforces exactly one active GSC source per workspace/project', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscConnections).values({
            ...baseGscConnection,
            projectId: project.id,
            siteUrl: 'sc-domain:example.com',
            isActive: true,
        });

        await expect(
            db.insert(gscConnections).values({
                ...baseGscConnection,
                projectId: project.id,
                siteUrl: 'https://staging.example.com/',
                isActive: true,
            })
        ).rejects.toThrow();

        await cleanupConnections(project.id);
    });

    it('allows a second GSC source for the same project when inactive', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscConnections).values({
            ...baseGscConnection,
            projectId: project.id,
            siteUrl: 'sc-domain:example.com',
            isActive: true,
        });

        await expect(
            db.insert(gscConnections).values({
                ...baseGscConnection,
                projectId: project.id,
                siteUrl: 'https://staging.example.com/',
                isActive: false,
            })
        ).resolves.not.toThrow();

        await cleanupConnections(project.id);
    });

    it('enforces exactly one active GA4 source per workspace/project', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(ga4Connections).values({
            ...baseGa4Connection,
            projectId: project.id,
            propertyId: '111111111',
            isActive: true,
        });

        await expect(
            db.insert(ga4Connections).values({
                ...baseGa4Connection,
                projectId: project.id,
                propertyId: '222222222',
                isActive: true,
            })
        ).rejects.toThrow();

        await cleanupConnections(project.id);
    });

    it('source-switch deletes old provider analytics data but leaves project/tasks intact', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscConnections).values({
            ...baseGscConnection,
            projectId: project.id,
            siteUrl: 'sc-domain:old.example.com',
            isActive: true,
        });

        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/old-page',
            query: 'old query',
            country: 'all',
            device: 'all',
            siteUrl: 'sc-domain:old.example.com',
            clicks: 5,
            impressions: 50,
            ctr: '0.1',
            position: '3.0',
        });
        await db.insert(gscDataAggregated).values({
            projectId: project.id,
            siteUrl: 'sc-domain:old.example.com',
            date: '2026-01-01',
            clicks: 5,
            impressions: 50,
            ctr: '0.1',
            position: '3.0',
        });

        // Simulate the confirmed source-change branch in routes/integrations/gsc.ts:
        // old provider data for the project is wiped before syncing the new source.
        await db.delete(gscData).where(eq(gscData.projectId, project.id));
        await db.delete(gscDataAggregated).where(eq(gscDataAggregated.projectId, project.id));

        const remainingRows = await db.select().from(gscData).where(eq(gscData.projectId, project.id));
        const remainingAgg = await db
            .select()
            .from(gscDataAggregated)
            .where(eq(gscDataAggregated.projectId, project.id));
        expect(remainingRows).toHaveLength(0);
        expect(remainingAgg).toHaveLength(0);

        const [stillExistingProject] = await db
            .select()
            .from((await import('@repo/db')).projects)
            .where(eq((await import('@repo/db')).projects.id, project.id));
        expect(stillExistingProject).toBeDefined();
        expect(stillExistingProject.id).toBe(project.id);

        await cleanupConnections(project.id);
    });

    it('source-switch deletes old GA4 data scoped to projectId only, not other projects', async () => {
        const projectA = await createTestProject({ workspaceId: TEST_WORKSPACE_ID, domain: 'https://project-a.example.com' });
        const projectB = await createTestProject({ workspaceId: TEST_WORKSPACE_ID, domain: 'https://project-b.example.com' });

        const ga4Row = {
            date: '2026-01-01',
            sessions: 10,
            users: 8,
            newUsers: 2,
            engagementRate: '0.5',
            averageSessionDuration: '30.0',
            conversions: 1,
            conversionRate: '0.1',
            revenue: '0',
            source: '(direct)',
            medium: '(none)',
            deviceCategory: 'desktop',
        };

        await db.insert(ga4Data).values({ ...ga4Row, projectId: projectA.id, propertyId: '111111111' });
        await db.insert(ga4Data).values({ ...ga4Row, projectId: projectB.id, propertyId: '222222222' });

        await db.delete(ga4Data).where(eq(ga4Data.projectId, projectA.id));

        const rowsA = await db.select().from(ga4Data).where(eq(ga4Data.projectId, projectA.id));
        const rowsB = await db.select().from(ga4Data).where(eq(ga4Data.projectId, projectB.id));
        expect(rowsA).toHaveLength(0);
        expect(rowsB).toHaveLength(1);

        await cleanupConnections(projectA.id);
        await cleanupConnections(projectB.id);
    });

    it('lastRowsSynced/lastDurationMs/lastAttemptedAt track a full sync lifecycle', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const [connection] = await db
            .insert(gscConnections)
            .values({
                ...baseGscConnection,
                projectId: project.id,
                siteUrl: 'sc-domain:example.com',
                isActive: true,
            })
            .returning();

        const attemptStart = new Date();
        await db
            .update(gscConnections)
            .set({ lastAttemptedAt: attemptStart, syncStatus: 'syncing', syncError: null })
            .where(eq(gscConnections.id, connection.id));

        const [syncingState] = await db
            .select()
            .from(gscConnections)
            .where(eq(gscConnections.id, connection.id));
        expect(syncingState.syncStatus).toBe('syncing');
        expect(syncingState.lastAttemptedAt).not.toBeNull();

        await db
            .update(gscConnections)
            .set({
                lastSyncedAt: new Date(),
                lastRowsSynced: 42,
                lastDurationMs: 1234,
                syncStatus: 'idle',
                syncError: null,
            })
            .where(eq(gscConnections.id, connection.id));

        const [finalState] = await db
            .select()
            .from(gscConnections)
            .where(eq(gscConnections.id, connection.id));
        expect(finalState.lastRowsSynced).toBe(42);
        expect(finalState.lastDurationMs).toBe(1234);
        expect(finalState.syncStatus).toBe('idle');
        expect(finalState.syncError).toBeNull();

        await cleanupConnections(project.id);
    });

    it('records syncError and zero lastRowsSynced on a failed sync attempt', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const [connection] = await db
            .insert(ga4Connections)
            .values({
                ...baseGa4Connection,
                projectId: project.id,
                propertyId: '111111111',
                isActive: true,
            })
            .returning();

        await db
            .update(ga4Connections)
            .set({
                syncStatus: 'error',
                syncError: 'invalid_grant: Google authorization revoked or expired',
                lastRowsSynced: 0,
                lastDurationMs: 500,
            })
            .where(eq(ga4Connections.id, connection.id));

        const [errored] = await db
            .select()
            .from(ga4Connections)
            .where(eq(ga4Connections.id, connection.id));
        expect(errored.syncStatus).toBe('error');
        expect(errored.syncError).toContain('invalid_grant');
        expect(errored.lastRowsSynced).toBe(0);

        await cleanupConnections(project.id);
    });
});
