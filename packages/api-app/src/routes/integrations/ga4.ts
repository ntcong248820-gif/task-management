import { Hono } from 'hono';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { auth } from '@repo/auth-config';
import { db, ga4Connections, ga4Data, eq, sql, and } from '@repo/db';
import { getValidAccessToken } from '../../utils/token-refresh';
import { encryptToken, decryptTokenValue } from '../../utils/crypto-tokens';
import { logger } from '../../utils/logger';
import { createSignedOAuthState, verifySignedOAuthState } from '../../utils/signed-oauth-state';
import { isUuid, projectBelongsToWorkspace } from '../../utils/project-access';

const log = logger.child('GA4');

interface GA4PropertySummary {
    propertyId: string;
    propertyName: string | null;
    name?: string | null;
}

class GA4Client {
    private oauth2Client: Auth.OAuth2Client;
    private analyticsdata: ReturnType<typeof google.analyticsdata>;

    constructor(accessToken: string, refreshToken: string) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!
        );
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        this.analyticsdata = google.analyticsdata('v1beta');
    }

    async listProperties(): Promise<GA4PropertySummary[]> {
        const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: this.oauth2Client });
        const summaryResponse = await analyticsadmin.accountSummaries.list();
        const summaries = summaryResponse.data.accountSummaries || [];
        const properties: GA4PropertySummary[] = [];

        for (const account of summaries) {
            for (const property of account.propertySummaries || []) {
                const propertyId = property.property?.split('/')[1] || '';
                if (!propertyId) continue;
                properties.push({
                    propertyId,
                    propertyName: property.displayName || null,
                    name: property.property,
                });
            }
        }

        return properties;
    }

    async fetchAnalyticsData(options: any) {
        const { propertyId, startDate, endDate } = options;

        const response = await this.analyticsdata.properties.runReport({
            auth: this.oauth2Client,
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [
                    { name: 'date' },
                    { name: 'sessionSource' },
                    { name: 'sessionMedium' },
                    { name: 'deviceCategory' },
                ],
                metrics: [
                    { name: 'sessions' },
                    { name: 'totalUsers' },
                    { name: 'newUsers' },
                    { name: 'engagementRate' },
                    { name: 'averageSessionDuration' },
                    { name: 'conversions' },
                    { name: 'totalRevenue' },
                ],
            },
        });

        const data = response.data;
        if (!data.rows || data.rows.length === 0) return [];

        return data.rows.map((row: any) => ({
            date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
            source: row.dimensionValues[1].value || '(direct)',
            medium: row.dimensionValues[2].value || '(none)',
            deviceCategory: row.dimensionValues[3].value || 'desktop',
            sessions: parseInt(row.metricValues[0].value) || 0,
            users: parseInt(row.metricValues[1].value) || 0,
            newUsers: parseInt(row.metricValues[2].value) || 0,
            engagementRate: parseFloat(row.metricValues[3].value) || 0,
            averageSessionDuration: parseFloat(row.metricValues[4].value) || 0,
            conversions: parseInt(row.metricValues[5].value) || 0,
            revenue: parseFloat(row.metricValues[6].value) || 0,
        }));
    }
}

const app = new Hono<{ Variables: { userId: string; workspaceId: string } }>();

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3002';
const getOAuthConfig = () => ({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_GA4_REDIRECT_URI!,
    scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
    ],
});

async function findProjectConnection(projectId: string, workspaceId: string, propertyId?: string) {
    const conditions = [
        eq(ga4Connections.projectId, projectId),
        eq(ga4Connections.workspaceId, workspaceId),
    ];

    if (propertyId) conditions.push(eq(ga4Connections.propertyId, propertyId));

    const [connection] = await db
        .select()
        .from(ga4Connections)
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
            integration: 'ga4',
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
        log.error('GA4 authorize error', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

app.get('/callback', async (c) => {
    try {
        const { code, state, error } = c.req.query();

        if (error) {
            return c.redirect(`${getFrontendUrl()}/dashboard/integrations?error=${encodeURIComponent(error)}`);
        }

        if (!code || !state) {
            return c.redirect(`${getFrontendUrl()}/dashboard/integrations?error=no_code`);
        }

        const stateData = verifySignedOAuthState(state, 'ga4');
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

        const client = new GA4Client(tokens.access_token, tokens.refresh_token);
        const properties = await client.listProperties();
        const selectedProperty = properties[0] ?? { propertyId: '', propertyName: null };
        const existingConnection = await findProjectConnection(stateData.projectId, stateData.workspaceId, selectedProperty.propertyId);

        const connectionData = {
            workspaceId: stateData.workspaceId,
            authorizedByUserId: stateData.userId,
            accountEmail,
            propertyId: selectedProperty.propertyId,
            propertyName: selectedProperty.propertyName,
            accessToken: encryptToken(tokens.access_token),
            refreshToken: encryptToken(tokens.refresh_token),
            tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
            syncStatus: 'idle' as const,
            syncError: null,
            updatedAt: new Date(),
        };

        if (existingConnection) {
            await db
                .update(ga4Connections)
                .set(connectionData)
                .where(eq(ga4Connections.id, existingConnection.id));
        } else {
            await db.insert(ga4Connections).values({
                projectId: stateData.projectId,
                ...connectionData,
            });
        }

        return c.redirect(`${getFrontendUrl()}/dashboard/integrations?success=ga4_connected`);
    } catch (callbackError) {
        log.error('GA4 callback error', callbackError);
        return c.redirect(`${getFrontendUrl()}/dashboard/integrations?error=connection_failed`);
    }
});

app.get('/properties', async (c) => {
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
            return c.json({ success: false, error: 'GA4 not connected' }, 404);
        }

        const validAccessToken = await getValidAccessToken(tokenRecord, 'ga4');
        const client = new GA4Client(validAccessToken, decryptTokenValue(tokenRecord.refreshToken));
        const properties = await client.listProperties();

        if (save === 'true') {
            for (const property of properties) {
                const existingConnection = await findProjectConnection(projectId, workspaceId, property.propertyId);
                const connectionData = {
                    workspaceId,
                    authorizedByUserId: c.get('userId'),
                    accountEmail: tokenRecord.accountEmail,
                    propertyId: property.propertyId,
                    propertyName: property.propertyName,
                    accessToken: tokenRecord.accessToken,
                    refreshToken: tokenRecord.refreshToken,
                    tokenExpiresAt: tokenRecord.tokenExpiresAt,
                    syncStatus: 'idle' as const,
                    syncError: null,
                    updatedAt: new Date(),
                };

                if (existingConnection) {
                    await db
                        .update(ga4Connections)
                        .set(connectionData)
                        .where(eq(ga4Connections.id, existingConnection.id));
                } else {
                    await db.insert(ga4Connections).values({
                        projectId,
                        ...connectionData,
                    });
                }
            }
        }

        return c.json({
            success: true,
            data: {
                properties,
                saved: save === 'true',
            },
        });
    } catch (propertyError: any) {
        log.error('GA4 properties discovery error', propertyError);
        return c.json({ success: false, error: 'Failed to discover GA4 properties' }, 500);
    }
});

app.post('/sync', async (c) => {
    try {
        const { projectId, propertyId, days: rawDays = 30 } = await c.req.json();

        if (!projectId || !isUuid(projectId) || !propertyId) {
            return c.json({ success: false, error: 'Valid projectId and propertyId are required' }, 400);
        }

        const workspaceId = c.get('workspaceId');
        if (!(await projectBelongsToWorkspace(projectId, workspaceId))) {
            return c.json({ success: false, error: 'Project not found' }, 404);
        }
        const tokenRecord = await findProjectConnection(projectId, workspaceId, propertyId)
            ?? await findProjectConnection(projectId, workspaceId);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GA4 not connected' }, 404);
        }

        await db
            .update(ga4Connections)
            .set({ syncStatus: 'syncing', syncError: null, updatedAt: new Date() })
            .where(eq(ga4Connections.id, tokenRecord.id));

        const days = Math.min(Math.max(parseInt(String(rawDays)) || 30, 1), 365);
        const validAccessToken = await getValidAccessToken(tokenRecord, 'ga4');
        const ga4Client = new GA4Client(validAccessToken, decryptTokenValue(tokenRecord.refreshToken));
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        const data = await ga4Client.fetchAnalyticsData({
            propertyId,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
        });

        const batchSize = 1000;
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const rows = data.slice(i, i + batchSize).map((row: any) => ({
                projectId,
                date: row.date,
                sessions: row.sessions,
                users: row.users,
                newUsers: row.newUsers,
                engagementRate: row.engagementRate.toString(),
                averageSessionDuration: row.averageSessionDuration.toString(),
                conversions: row.conversions,
                conversionRate: row.sessions > 0 ? (row.conversions / row.sessions).toFixed(4) : '0',
                revenue: row.revenue.toString(),
                source: row.source,
                medium: row.medium,
                deviceCategory: row.deviceCategory,
            }));

            await db.insert(ga4Data).values(rows).onConflictDoUpdate({
                target: [ga4Data.projectId, ga4Data.date, ga4Data.source, ga4Data.medium, ga4Data.deviceCategory],
                set: {
                    sessions: sql`EXCLUDED.sessions`,
                    users: sql`EXCLUDED.users`,
                    newUsers: sql`EXCLUDED.new_users`,
                    engagementRate: sql`EXCLUDED.engagement_rate`,
                    averageSessionDuration: sql`EXCLUDED.average_session_duration`,
                    conversions: sql`EXCLUDED.conversions`,
                    conversionRate: sql`EXCLUDED.conversion_rate`,
                    revenue: sql`EXCLUDED.revenue`,
                    updatedAt: sql`NOW()`,
                },
            });

            totalInserted += rows.length;
        }

        await db
            .update(ga4Connections)
            .set({ lastSyncedAt: new Date(), syncStatus: 'idle', syncError: null, updatedAt: new Date() })
            .where(eq(ga4Connections.id, tokenRecord.id));

        return c.json({
            success: true,
            message: `Successfully synced ${totalInserted} rows`,
            rowsSynced: totalInserted,
            dateRange: { start: formatDate(startDate), end: formatDate(endDate) },
        });
    } catch (syncError: any) {
        log.error('GA4 sync error', syncError);
        return c.json({ success: false, error: 'Failed to sync GA4 data' }, 500);
    }
});

export default app;
