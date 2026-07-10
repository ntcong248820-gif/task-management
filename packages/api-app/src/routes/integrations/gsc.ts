import { Hono } from 'hono';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { auth } from '@repo/auth-config';
import { db, gscConnections, gscData, gscDataAggregated, projects, eq, sql, and } from '@repo/db';
import { getValidAccessToken } from '../../utils/token-refresh';
import { encryptToken, decryptTokenValue } from '../../utils/crypto-tokens';
import { logger } from '../../utils/logger';
import { createSignedOAuthState, verifySignedOAuthState } from '../../utils/signed-oauth-state';
import { isUuid, projectBelongsToWorkspace } from '../../utils/project-access';

const log = logger.child('GSC');

class GSCClient {
    private oauth2Client: Auth.OAuth2Client;
    private searchconsole: ReturnType<typeof google.searchconsole>;

    constructor(accessToken: string, refreshToken: string) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!
        );
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        this.searchconsole = google.searchconsole({ version: 'v1', auth: this.oauth2Client });
    }

    async listSites() {
        const response = await this.searchconsole.sites.list();
        return response.data.siteEntry || [];
    }

    async fetchSearchAnalytics(options: any) {
        const { siteUrl, startDate, endDate, dimensions = ['date', 'page', 'query', 'country', 'device'], rowLimit = 25000, startRow = 0 } = options;
        const response = await this.searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: { startDate, endDate, dimensions, rowLimit, startRow, dimensionFilterGroups: [] },
        });
        const data = response.data;
        if (!data.rows || data.rows.length === 0) return [];
        return data.rows.map((row: any) => {
            const dimensionMap: Record<string, string> = {};
            dimensions.forEach((dim: string, index: number) => { dimensionMap[dim] = row.keys[index] || 'all'; });
            return {
                date: dimensionMap.date || new Date().toISOString().split('T')[0],
                page: dimensionMap.page || '',
                query: dimensionMap.query || '',
                country: dimensionMap.country || 'all',
                device: dimensionMap.device || 'all',
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position,
            };
        });
    }

    async fetchAllSearchAnalytics(options: any) {
        const allData: any[] = [];
        let startRow = 0;
        const rowLimit = 25000;
        let pageNumber = 1;

        while (true) {
            const batch = await this.fetchSearchAnalytics({ ...options, rowLimit, startRow });
            if (batch.length === 0) break;
            for (const row of batch) allData.push(row);
            if (batch.length < rowLimit) break;
            startRow += rowLimit;
            pageNumber++;
            if (pageNumber > 100) {
                log.warn('Safety limit reached (100 pages). Stopping pagination.');
                break;
            }
        }

        return allData;
    }

    private chunkDateRange(startDate: string, endDate: string, chunkDays: number) {
        const chunks: Array<{ startDate: string; endDate: string }> = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        let currentStart = new Date(start);

        while (currentStart <= end) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + chunkDays - 1);
            if (currentEnd > end) currentEnd.setTime(end.getTime());

            chunks.push({
                startDate: currentStart.toISOString().split('T')[0],
                endDate: currentEnd.toISOString().split('T')[0],
            });
            currentStart.setDate(currentStart.getDate() + chunkDays);
        }

        return chunks;
    }

    async fetchAllWithChunking(options: any, chunkDays: number = 7) {
        const chunks = this.chunkDateRange(options.startDate, options.endDate, chunkDays);
        const allData: any[] = [];

        for (const chunk of chunks) {
            const chunkData = await this.fetchAllSearchAnalytics({
                ...options,
                startDate: chunk.startDate,
                endDate: chunk.endDate,
            });
            for (const row of chunkData) allData.push(row);
        }

        return allData;
    }
}

const app = new Hono<{ Variables: { userId: string; workspaceId: string } }>();

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3002';

const getOAuthConfig = () => ({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_GSC_REDIRECT_URI!,
    scopes: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
    ],
});

async function findProjectConnection(projectId: string, workspaceId: string, siteUrl?: string) {
    const conditions = [
        eq(gscConnections.projectId, projectId),
        eq(gscConnections.workspaceId, workspaceId),
    ];

    if (siteUrl) conditions.push(eq(gscConnections.siteUrl, siteUrl));

    const [connection] = await db
        .select()
        .from(gscConnections)
        .where(and(...conditions))
        .limit(1);

    return connection ?? null;
}

app.get('/authorize', async (c) => {
    try {
        const { projectId } = c.req.query();

        if (!projectId || !isUuid(projectId)) {
            return c.json({ success: false, error: 'Invalid project ID' }, 400);
        }
        if (!(await projectBelongsToWorkspace(projectId, c.get('workspaceId')))) {
            return c.json({ success: false, error: 'Project not found' }, 404);
        }

        const oauthConfig = getOAuthConfig();
        const oauth2Client = new google.auth.OAuth2(
            oauthConfig.clientId,
            oauthConfig.clientSecret,
            oauthConfig.redirectUri
        );

        const state = createSignedOAuthState({
            integration: 'gsc',
            projectId,
            userId: c.get('userId'),
            workspaceId: c.get('workspaceId'),
        });

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: oauthConfig.scopes,
            state,
            prompt: 'consent',
        });

        return c.json({ success: true, data: { authUrl, state } });
    } catch (error) {
        log.error('GSC authorize error', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

app.get('/callback', async (c) => {
    try {
        const { code, state, error } = c.req.query();

        if (error) {
            return c.redirect(`${getFrontendUrl()}/dashboard/settings/integrations?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return c.redirect(`${getFrontendUrl()}/dashboard/settings/integrations?error=no_code`);
        }

        const stateData = verifySignedOAuthState(state, 'gsc');
        const session = await auth.api.getSession({ headers: c.req.raw.headers });

        if (
            !session ||
            session.user.id !== stateData.userId ||
            session.session.activeOrganizationId !== stateData.workspaceId
        ) {
            throw new Error('OAuth state does not match active session');
        }
        if (!(await projectBelongsToWorkspace(stateData.projectId, stateData.workspaceId))) {
            throw new Error('OAuth project does not belong to workspace');
        }

        const oauthConfig = getOAuthConfig();
        const oauth2Client = new google.auth.OAuth2(
            oauthConfig.clientId,
            oauthConfig.clientSecret,
            oauthConfig.redirectUri
        );
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Missing tokens from Google OAuth');
        }

        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const accountEmail = userInfo.data.email || null;

        const client = new GSCClient(tokens.access_token, tokens.refresh_token);
        const sites = await client.listSites();

        // Pick site by matching project domain, then prefer sc-domain: property, then first
        const [projectRow] = await db
            .select({ domain: projects.domain })
            .from(projects)
            .where(eq(projects.id, stateData.projectId))
            .limit(1);
        const projectDomain = projectRow?.domain ?? '';
        const domainMatch = projectDomain
            ? sites.find((s: any) => s.siteUrl?.includes(projectDomain))
            : null;
        const selectedSite = domainMatch
            || sites.find((site: any) => site.siteUrl?.startsWith('sc-domain:'))
            || sites[0];

        const existingConnection = await findProjectConnection(stateData.projectId, stateData.workspaceId);

        const connectionData = {
            workspaceId: stateData.workspaceId,
            authorizedByUserId: stateData.userId,
            accountEmail,
            siteUrl: selectedSite?.siteUrl || '',
            permissionLevel: selectedSite?.permissionLevel || null,
            accessToken: encryptToken(tokens.access_token),
            refreshToken: encryptToken(tokens.refresh_token),
            tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
            syncStatus: 'idle' as const,
            syncError: null,
            updatedAt: new Date(),
        };

        if (existingConnection) {
            await db
                .update(gscConnections)
                .set(connectionData)
                .where(eq(gscConnections.id, existingConnection.id));
        } else {
            await db.insert(gscConnections).values({
                projectId: stateData.projectId,
                ...connectionData,
            });
        }

        return c.redirect(`${getFrontendUrl()}/dashboard/settings/integrations?success=gsc_connected`);
    } catch (callbackError) {
        log.error('GSC callback error', callbackError);
        return c.redirect(`${getFrontendUrl()}/dashboard/settings/integrations?error=connection_failed`);
    }
});

app.get('/sites', async (c) => {
    try {
        const { projectId, save } = c.req.query();

        if (!projectId || !isUuid(projectId)) {
            return c.json({ success: false, error: 'Invalid project ID' }, 400);
        }

        const workspaceId = c.get('workspaceId');
        if (!(await projectBelongsToWorkspace(projectId, workspaceId))) {
            return c.json({ success: false, error: 'Project not found' }, 404);
        }
        const tokenRecord = await findProjectConnection(projectId, workspaceId);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GSC not connected' }, 404);
        }

        const validAccessToken = await getValidAccessToken(tokenRecord, 'gsc');
        const client = new GSCClient(validAccessToken, decryptTokenValue(tokenRecord.refreshToken));
        const sites = await client.listSites();

        if (save === 'true') {
            return c.json({ success: false, error: 'Bulk saving discovered GSC sites is disabled. Select and sync one site instead.' }, 400);
        }

        return c.json({
            success: true,
            data: {
                sites: sites.map(site => ({
                    siteUrl: site.siteUrl,
                    permissionLevel: site.permissionLevel,
                })),
                saved: false,
            },
        });
    } catch (siteError: any) {
        log.error('GSC sites discovery error', siteError);
        return c.json({ success: false, error: 'Failed to discover GSC sites' }, 500);
    }
});

app.post('/sync', async (c) => {
    try {
        const { projectId, siteUrl, days: rawDays = 30 } = await c.req.json();

        if (!projectId || !isUuid(projectId) || !siteUrl) {
            return c.json({ success: false, error: 'Valid projectId and siteUrl are required' }, 400);
        }

        const workspaceId = c.get('workspaceId');
        if (!(await projectBelongsToWorkspace(projectId, workspaceId))) {
            return c.json({ success: false, error: 'Project not found' }, 404);
        }
        const tokenRecord = await findProjectConnection(projectId, workspaceId, siteUrl)
            ?? await findProjectConnection(projectId, workspaceId);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GSC not connected' }, 404);
        }

        await db
            .update(gscConnections)
            .set({ syncStatus: 'syncing', syncError: null, updatedAt: new Date() })
            .where(eq(gscConnections.id, tokenRecord.id));

        const days = Math.min(Math.max(parseInt(String(rawDays)) || 30, 1), 365);
        const validAccessToken = await getValidAccessToken(tokenRecord, 'gsc');
        const gscClient = new GSCClient(validAccessToken, decryptTokenValue(tokenRecord.refreshToken));
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const data = await gscClient.fetchAllWithChunking({
            siteUrl,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['date', 'page', 'query', 'country', 'device'],
        }, 7);

        const batchSize = 1000;
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const rows = data.slice(i, i + batchSize).map((row: any) => ({
                projectId,
                date: row.date,
                page: row.page,
                query: row.query,
                country: row.country,
                device: row.device,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr.toString(),
                position: row.position.toString(),
            }));

            await db.insert(gscData).values(rows).onConflictDoUpdate({
                target: [gscData.projectId, gscData.date, gscData.page, gscData.query, gscData.country, gscData.device],
                set: {
                    clicks: sql`EXCLUDED.clicks`,
                    impressions: sql`EXCLUDED.impressions`,
                    ctr: sql`EXCLUDED.ctr`,
                    position: sql`EXCLUDED.position`,
                    updatedAt: sql`NOW()`,
                },
            });

            totalInserted += rows.length;
        }

        const aggAllData = await gscClient.fetchAllSearchAnalytics({
            siteUrl,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['date'],
        });

        if (aggAllData.length > 0) {
            const aggRows = aggAllData.map((row: any) => ({
                projectId,
                siteUrl,
                date: row.date,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr.toString(),
                position: row.position.toString(),
            }));

            await db.insert(gscDataAggregated).values(aggRows).onConflictDoUpdate({
                target: [gscDataAggregated.projectId, gscDataAggregated.siteUrl, gscDataAggregated.date],
                set: {
                    clicks: sql`EXCLUDED.clicks`,
                    impressions: sql`EXCLUDED.impressions`,
                    ctr: sql`EXCLUDED.ctr`,
                    position: sql`EXCLUDED.position`,
                    updatedAt: sql`NOW()`,
                },
            });
        }

        // Update siteUrl to reflect which site was actually synced
        await db
            .update(gscConnections)
            .set({ siteUrl, lastSyncedAt: new Date(), syncStatus: 'idle', syncError: null, updatedAt: new Date() })
            .where(eq(gscConnections.id, tokenRecord.id));

        return c.json({
            success: true,
            message: `Successfully synced ${totalInserted} rows`,
            rowsSynced: totalInserted,
            dateRange: { start: formatDate(startDate), end: formatDate(endDate) },
        });
    } catch (syncError: any) {
        log.error('GSC sync error', syncError);
        try {
            const { projectId, siteUrl } = await c.req.json().catch(() => ({})) as any;
            if (projectId && isUuid(projectId)) {
                const workspaceId = c.get('workspaceId');
                const conn = await findProjectConnection(projectId, workspaceId, siteUrl)
                    ?? await findProjectConnection(projectId, workspaceId);
                if (conn) {
                    await db.update(gscConnections)
                        .set({ syncStatus: 'error', syncError: syncError.message ?? 'Sync failed', updatedAt: new Date() })
                        .where(eq(gscConnections.id, conn.id));
                }
            }
        } catch (_) { /* best-effort */ }
        return c.json({ success: false, error: syncError.message ?? 'Failed to sync GSC data' }, 500);
    }
});

export default app;
