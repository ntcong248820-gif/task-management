import { Hono } from 'hono';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { db, oauthTokens, ga4Data, ga4Properties, eq, sql, and } from '@repo/db';
import crypto from 'crypto';
import { getValidAccessToken } from '../../utils/token-refresh';
import { encryptToken, decryptTokenValue } from '../../utils/crypto-tokens';
import { logger } from '../../utils/logger';

const log = logger.child('GA4');

// Inline GA4Client to avoid monorepo import issues
class GA4Client {
    private oauth2Client: Auth.OAuth2Client;
    private analyticsdata: ReturnType<typeof google.analyticsdata>;

    constructor(accessToken: string, refreshToken: string) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!
            // redirect URI not needed for data fetching
        );
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        // Use googleapis analyticsdata API
        // Do not pass auth here to avoid "getUniverseDomain" error during init
        this.analyticsdata = google.analyticsdata('v1beta');
    }

    async fetchAnalyticsData(options: any) {
        const { propertyId, startDate, endDate } = options;

        const response = await this.analyticsdata.properties.runReport({
            auth: this.oauth2Client, // Pass auth here
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

const app = new Hono();

// OAuth configuration - GA4 uses its own redirect URI
const getOAuthConfig = () => {
    const redirectUri = process.env.GOOGLE_GA4_REDIRECT_URI!;

    log.info(`Using redirect URI: ${redirectUri}`);

    return {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri,
        scopes: [
            'https://www.googleapis.com/auth/analytics.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid',
        ],
    };
};

/**
 * GET /api/integrations/ga4/authorize
 * Initiates OAuth flow for Google Analytics 4
 */
app.get('/authorize', async (c) => {
    try {
        const { projectId } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'Project ID is required' }, 400);
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            getOAuthConfig().clientId,
            getOAuthConfig().clientSecret,
            getOAuthConfig().redirectUri
        );

        // Generate state for CSRF protection (encode integration type)
        const stateData = {
            random: crypto.randomBytes(16).toString('hex'),
            integration: 'ga4',
            projectId,
        };
        const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

        // Generate authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: getOAuthConfig().scopes,
            state,
            prompt: 'consent',
        });

        return c.json({
            success: true,
            data: {
                authUrl,
                state,
            },
        });
    } catch (error) {
        log.error('GA4 authorize error:', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

/**
 * GET /api/integrations/ga4/callback
 * Handles OAuth callback from Google
 */
app.get('/callback', async (c) => {
    try {
        const { code, state, error } = c.req.query();

        log.info(`Received: code=${code?.substring(0, 20)}..., error=${error}, state=${state?.substring(0, 20)}...`);

        // Handle OAuth error
        if (error) {
            log.error(`OAuth error: ${error}`);
            return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=${encodeURIComponent(error)}`);
        }

        if (!code) {
            log.error('No code provided');
            return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=no_code`);
        }

        // Parse state to get projectId
        let projectId: number;
        try {
            if (!state) {
                throw new Error('State parameter missing');
            }
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            projectId = parseInt(stateData.projectId);

            if (!projectId || isNaN(projectId)) {
                throw new Error('Invalid projectId in state');
            }
            log.info(`Project ID from state: ${projectId}`);
        } catch (stateError) {
            log.error('State parsing error:', stateError);
            return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=invalid_state`);
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            getOAuthConfig().clientId,
            getOAuthConfig().clientSecret,
            getOAuthConfig().redirectUri
        );

        log.info('Exchanging code for tokens...');

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        log.info(`Tokens received: hasAccessToken=${!!tokens.access_token}, hasRefreshToken=${!!tokens.refresh_token}, expiryDate=${tokens.expiry_date}`);

        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Missing tokens from Google OAuth');
        }

        // Get user info (email)
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

        log.info('Fetching user info...');
        const userInfo = await oauth2.userinfo.get();
        const accountEmail = userInfo.data.email || null;

        log.info(`User email: ${accountEmail}`);

        // Check if token already exists for this project
        const existingToken = await db
            .select()
            .from(oauthTokens)
            .where(
                and(
                    eq(oauthTokens.projectId, projectId),
                    eq(oauthTokens.provider, 'google_analytics')
                )
            )
            .limit(1);

        log.info(`Storing tokens in database for project ${projectId}`);

        if (existingToken.length > 0) {
            // Update existing token
            await db
                .update(oauthTokens)
                .set({
                    accessToken: encryptToken(tokens.access_token),
                    refreshToken: encryptToken(tokens.refresh_token),
                    expiresAt: new Date(tokens.expiry_date!),
                    tokenType: tokens.token_type || 'Bearer',
                    scope: tokens.scope || '',
                    accountEmail,
                    updatedAt: new Date(),
                })
                .where(eq(oauthTokens.id, existingToken[0].id));
        } else {
            // Insert new token
            await db.insert(oauthTokens).values({
                projectId,
                provider: 'google_analytics',
                accessToken: encryptToken(tokens.access_token),
                refreshToken: encryptToken(tokens.refresh_token),
                expiresAt: new Date(tokens.expiry_date!),
                tokenType: tokens.token_type || 'Bearer',
                scope: tokens.scope || '',
                accountEmail,
            });
        }

        log.info(`GA4 connected successfully for project ${projectId}`);

        // Discover and save GA4 properties after OAuth connect
        try {
            const oauth2ClientForProps = new google.auth.OAuth2(
                getOAuthConfig().clientId,
                getOAuthConfig().clientSecret,
                getOAuthConfig().redirectUri
            );
            oauth2ClientForProps.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2ClientForProps });
            const summaryResponse = await analyticsadmin.accountSummaries.list();
            const summaries = summaryResponse.data.accountSummaries || [];

            const allProperties: any[] = [];
            summaries.forEach((account: any) => {
                if (account.propertySummaries) allProperties.push(...account.propertySummaries);
            });

            for (const prop of allProperties) {
                const propertyId = prop.property?.split('/')[1] || '';
                if (!propertyId) continue;

                const existing = await db
                    .select({ id: ga4Properties.id })
                    .from(ga4Properties)
                    .where(and(
                        eq(ga4Properties.projectId, projectId),
                        eq(ga4Properties.propertyId, propertyId)
                    ))
                    .limit(1);

                if (existing.length === 0) {
                    await db.insert(ga4Properties).values({
                        projectId,
                        propertyId,
                        propertyName: prop.displayName || null,
                    });
                    log.info(`Saved GA4 property ${propertyId} (${prop.displayName}) for project ${projectId}`);
                }
            }

            if (allProperties.length === 0) {
                log.warn(`No GA4 properties found for account — user needs to add manually`);
            }
        } catch (propError) {
            log.error('Failed to discover/save GA4 properties during callback:', propError);
        }

        // Redirect back to integrations page with success
        return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?success=ga4_connected`);
    } catch (error: any) {
        const errorDetails = {
            message: error.message,
            code: error.code,
            status: error.status,
            response: error.response?.data,
        };
        log.error('GA4 callback error:', errorDetails);

        // Redirect with error
        return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=connection_failed`);
    }
});

/**
 * GET /api/integrations/ga4/properties
 * Discover and list available GA4 properties
 */
app.get('/properties', async (c) => {
    try {
        const { projectId, save } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        // Get OAuth tokens
        const [tokenRecord] = await db
            .select()
            .from(oauthTokens)
            .where(
                and(
                    eq(oauthTokens.projectId, parseInt(projectId)),
                    eq(oauthTokens.provider, 'google_analytics')
                )
            )
            .limit(1);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GA4 not connected' }, 404);
        }

        // Get valid access token (auto-refresh if expired)
        const validAccessToken = await getValidAccessToken(tokenRecord);

        // Create OAuth2 client (no redirect URI needed for data fetching)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!
        );
        oauth2Client.setCredentials({
            access_token: validAccessToken,
            refresh_token: decryptTokenValue(tokenRecord.refreshToken),
        });

        // List properties using Admin API
        const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
        const response = await analyticsadmin.properties.list();

        const properties = response.data.properties || [];

        // Optionally save to database
        if (save === 'true' && properties.length > 0) {
            for (const property of properties) {
                // Extract property ID from name (format: properties/123456789)
                const propertyId = property.name?.split('/')[1] || '';

                if (!propertyId) continue;

                // Check if property already exists
                const existing = await db
                    .select()
                    .from(ga4Properties)
                    .where(
                        and(
                            eq(ga4Properties.projectId, parseInt(projectId)),
                            eq(ga4Properties.propertyId, propertyId)
                        )
                    )
                    .limit(1);

                if (existing.length === 0) {
                    // Insert new property
                    await db.insert(ga4Properties).values({
                        projectId: parseInt(projectId),
                        propertyId,
                        propertyName: property.displayName || null,
                    });
                }
            }
        }

        return c.json({
            success: true,
            data: {
                properties: properties.map(p => ({
                    propertyId: p.name?.split('/')[1] || '',
                    propertyName: p.displayName,
                    name: p.name,
                })),
                saved: save === 'true',
            },
        });
    } catch (error: any) {
        log.error('GA4 properties discovery error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to discover GA4 properties',
        }, 500);
    }
});

/**
 * POST /api/integrations/ga4/sync
 * Manually trigger GA4 data sync
 */
app.post('/sync', async (c) => {
    try {
        const { projectId, propertyId, days: rawDays = 30 } = await c.req.json();

        if (!projectId || !propertyId) {
            return c.json({ success: false, error: 'projectId and propertyId are required' }, 400);
        }

        const days = Math.min(Math.max(parseInt(rawDays) || 30, 1), 365);

        // Get OAuth tokens
        const [tokenRecord] = await db
            .select()
            .from(oauthTokens)
            .where(
                and(
                    eq(oauthTokens.projectId, projectId),
                    eq(oauthTokens.provider, 'google_analytics')
                )
            )
            .limit(1);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GA4 not connected' }, 404);
        }

        // Get valid access token (auto-refresh if expired)
        const validAccessToken = await getValidAccessToken(tokenRecord);

        // Initialize GA4 client with valid token
        const ga4Client = new GA4Client(
            validAccessToken,
            decryptTokenValue(tokenRecord.refreshToken)
        );

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        // Fetch data from GA4
        const data = await ga4Client.fetchAnalyticsData({
            propertyId,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
        });

        if (data.length === 0) {
            return c.json({
                success: true,
                message: 'No data found for the specified period',
                rowsSynced: 0,
            });
        }

        // Batch insert data
        const batchSize = 1000;
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            const rows = batch.map((row: any) => ({
                projectId,
                date: row.date,
                sessions: row.sessions,
                users: row.users,
                newUsers: row.newUsers,
                engagementRate: row.engagementRate.toString(),
                averageSessionDuration: row.averageSessionDuration.toString(),
                conversions: row.conversions,
                conversionRate: row.conversions > 0 ? (row.conversions / row.sessions).toFixed(4) : '0',
                revenue: row.revenue.toString(),
                source: row.source,
                medium: row.medium,
                deviceCategory: row.deviceCategory,
            }));

            // Upsert (insert or update on conflict)
            await db
                .insert(ga4Data)
                .values(rows)
                .onConflictDoUpdate({
                    target: [
                        ga4Data.projectId,
                        ga4Data.date,
                        ga4Data.source,
                        ga4Data.medium,
                        ga4Data.deviceCategory,
                    ],
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

        // Record successful sync timestamp
        await db
            .update(oauthTokens)
            .set({ lastSyncedAt: new Date() })
            .where(and(eq(oauthTokens.projectId, projectId), eq(oauthTokens.provider, 'google_analytics')));

        return c.json({
            success: true,
            message: `Successfully synced ${totalInserted} rows`,
            rowsSynced: totalInserted,
            dateRange: {
                start: formatDate(startDate),
                end: formatDate(endDate),
            },
        });
    } catch (error: any) {
        log.error('GA4 sync error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to sync GA4 data',
        }, 500);
    }
});

export default app;
