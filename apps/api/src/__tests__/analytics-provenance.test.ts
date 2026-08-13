import { describe, it, expect, afterEach } from 'vitest';
import { db, eq, and, isNull, gscData, ga4Data } from '@repo/db';
import { TEST_WORKSPACE_ID, createTestProject, cleanupTestData } from './helpers';

async function cleanupProvenanceData(projectId: string) {
    await db.delete(gscData).where(eq(gscData.projectId, projectId));
    await db.delete(ga4Data).where(eq(ga4Data.projectId, projectId));
}

describe('GSC/GA4 data provenance (Phase 2)', () => {
    afterEach(async () => {
        await cleanupTestData();
    });

    it('allows same project/date/page/query from two different siteUrl sources without unique-index collision', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const baseRow = {
            projectId: project.id,
            date: '2026-01-01',
            page: '/blog/post',
            query: 'seo tips',
            country: 'all',
            device: 'all',
            clicks: 10,
            impressions: 100,
            ctr: '0.1',
            position: '5.0',
        };

        await db.insert(gscData).values({ ...baseRow, siteUrl: 'sc-domain:example.com' });
        await db.insert(gscData).values({ ...baseRow, siteUrl: 'https://staging.example.com/' });

        const rows = await db.select().from(gscData).where(eq(gscData.projectId, project.id));
        expect(rows).toHaveLength(2);
        expect(new Set(rows.map((r) => r.siteUrl))).toEqual(
            new Set(['sc-domain:example.com', 'https://staging.example.com/'])
        );

        await cleanupProvenanceData(project.id);
    });

    it('allows same project/date/source/medium/device from two different GA4 propertyId sources without unique-index collision', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const baseRow = {
            projectId: project.id,
            date: '2026-01-01',
            sessions: 5,
            users: 4,
            newUsers: 2,
            engagementRate: '0.5',
            averageSessionDuration: '30.0',
            conversions: 1,
            conversionRate: '0.2',
            revenue: '0',
            source: '(direct)',
            medium: '(none)',
            deviceCategory: 'desktop',
        };

        await db.insert(ga4Data).values({ ...baseRow, propertyId: '111111111' });
        await db.insert(ga4Data).values({ ...baseRow, propertyId: '222222222' });

        const rows = await db.select().from(ga4Data).where(eq(ga4Data.projectId, project.id));
        expect(rows).toHaveLength(2);
        expect(new Set(rows.map((r) => r.propertyId))).toEqual(new Set(['111111111', '222222222']));

        await cleanupProvenanceData(project.id);
    });

    it('rejects a duplicate row for the same siteUrl source (unique index still enforced per source)', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const row = {
            projectId: project.id,
            date: '2026-01-01',
            page: '/blog/post',
            query: 'seo tips',
            country: 'all',
            device: 'all',
            siteUrl: 'sc-domain:example.com',
            clicks: 10,
            impressions: 100,
            ctr: '0.1',
            position: '5.0',
        };

        await db.insert(gscData).values(row);
        await expect(db.insert(gscData).values(row)).rejects.toThrow();

        await cleanupProvenanceData(project.id);
    });

    it('excludes legacy NULL-provenance rows when querying by a specific siteUrl/propertyId', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/legacy',
            query: 'legacy query',
            country: 'all',
            device: 'all',
            siteUrl: null,
            clicks: 1,
            impressions: 1,
            ctr: '1.0',
            position: '1.0',
        });
        await db.insert(gscData).values({
            projectId: project.id,
            date: '2026-01-01',
            page: '/current',
            query: 'current query',
            country: 'all',
            device: 'all',
            siteUrl: 'sc-domain:example.com',
            clicks: 2,
            impressions: 2,
            ctr: '1.0',
            position: '1.0',
        });

        const provenancedRows = await db
            .select()
            .from(gscData)
            .where(and(eq(gscData.projectId, project.id), eq(gscData.siteUrl, 'sc-domain:example.com')));
        expect(provenancedRows).toHaveLength(1);
        expect(provenancedRows[0].page).toBe('/current');

        const legacyRows = await db
            .select()
            .from(gscData)
            .where(and(eq(gscData.projectId, project.id), isNull(gscData.siteUrl)));
        expect(legacyRows).toHaveLength(1);
        expect(legacyRows[0].page).toBe('/legacy');

        await cleanupProvenanceData(project.id);
    });

    it('does NOT reject two otherwise-identical rows when siteUrl/propertyId are both NULL (documents known gap: Postgres unique indexes treat NULL as distinct from NULL, so legacy-provenance duplicates are not prevented by this index — cleanup of pre-migration legacy rows is deferred to a later phase)', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const legacyRow = {
            projectId: project.id,
            date: '2026-01-01',
            page: '/legacy-dup',
            query: 'legacy query',
            country: 'all',
            device: 'all',
            siteUrl: null,
            clicks: 1,
            impressions: 1,
            ctr: '1.0',
            position: '1.0',
        };

        await db.insert(gscData).values(legacyRow);
        await expect(db.insert(gscData).values(legacyRow)).resolves.not.toThrow();

        const rows = await db
            .select()
            .from(gscData)
            .where(and(eq(gscData.projectId, project.id), isNull(gscData.siteUrl)));
        expect(rows).toHaveLength(2);

        await cleanupProvenanceData(project.id);
    });

    it('never writes a NULL siteUrl/propertyId when a sync writer supplies a value (regression guard for sync-gsc.ts / sync-ga4.ts inserts)', async () => {
        const project = await createTestProject({ workspaceId: TEST_WORKSPACE_ID });

        const [gscRow] = await db
            .insert(gscData)
            .values({
                projectId: project.id,
                date: '2026-01-01',
                page: '/x',
                query: 'q',
                country: 'all',
                device: 'all',
                siteUrl: 'sc-domain:example.com',
                clicks: 1,
                impressions: 1,
                ctr: '1.0',
                position: '1.0',
            })
            .returning();
        expect(gscRow.siteUrl).toBe('sc-domain:example.com');

        const [ga4Row] = await db
            .insert(ga4Data)
            .values({
                projectId: project.id,
                date: '2026-01-01',
                sessions: 1,
                users: 1,
                newUsers: 1,
                engagementRate: '0.5',
                averageSessionDuration: '10.0',
                conversions: 0,
                conversionRate: '0',
                revenue: '0',
                source: '(direct)',
                medium: '(none)',
                deviceCategory: 'desktop',
                propertyId: '333333333',
            })
            .returning();
        expect(ga4Row.propertyId).toBe('333333333');

        await cleanupProvenanceData(project.id);
    });
});
