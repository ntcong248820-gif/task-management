import { Hono } from 'hono';
import { google } from 'googleapis';
import { db, oauthTokens, ga4Data, eq, sql, and } from '@repo/db';
import crypto from 'crypto';
import { getValidAccessToken } from '../../utils/token-refresh';

// Inline GA4Client to avoid monorepo import issues
class GA4Client {
    private oauth2Client: any;
    private analyticsdata: any;

    constructor(accessToken: string, refreshToken: string) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.GOOGLE_REDIRECT_URI!
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

// OAuth configuration
const getOAuthConfig = () => ({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
    ],
});

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
        console.error('GA4 authorize error:', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

/**
 * GET /api/integrations/ga4/callback
 * Handles OAuth callback from Google
 */
app.get('/callback', async (c) => {
    try {
        const { code, error } = c.req.query();

        console.log('[GA4 Callback] Received:', { code: code?.substring(0, 20) + '...', error });

        if (error) {
            console.error('[GA4 Callback] OAuth error:', error);
            return c.json({ success: false, error: `OAuth error: ${error}` }, 400);
        }

        if (!code) {
            console.error('[GA4 Callback] No code provided');
            return c.json({ success: false, error: 'Authorization code is required' }, 400);
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            getOAuthConfig().clientId,
            getOAuthConfig().clientSecret,
            getOAuthConfig().redirectUri
        );

        console.log('[GA4 Callback] Exchanging code for tokens...');

        // Manual logging since logToFile is broken
        console.log('Attempting to exchange code for tokens', { code: code?.substring(0, 10) });

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        console.log('Tokens received', {
            hasAccess: !!tokens.access_token,
            hasRefresh: !!tokens.refresh_token,
            expiry: tokens.expiry_date
        });

        console.log('[GA4 Callback] Tokens received details:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiryDate: tokens.expiry_date,
        });

        // Get user info (email)
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

        console.log('[GA4 Callback] Fetching user info...');
        const userInfo = await oauth2.userinfo.get();
        const accountEmail = userInfo.data.email || null;

        console.log('[GA4 Callback] User email:', accountEmail);

        // TODO: Get projectId from state storage
        const projectId = 1;

        console.log('[GA4 Callback] Storing tokens in database...');

        // Store tokens in database
        await db.insert(oauthTokens).values({
            projectId,
            provider: 'google_analytics',
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiresAt: new Date(tokens.expiry_date!),
            tokenType: tokens.token_type!,
            scope: tokens.scope!,
            accountEmail,
        });

        console.log('[GA4 Callback] Success! Tokens stored.');

        return c.json({ success: true, message: 'Google Analytics connected successfully' });
    } catch (error: any) {
        const errorDetails = {
            message: error.message,
            code: error.code,
            status: error.status,
            response: error.response?.data,
            stack: error.stack
        };
        console.error('[GA4 Callback] Error:', errorDetails);

        // Return detailed error for debugging
        return c.json({
            success: false,
            error: 'Failed to connect Google Analytics',
            details: errorDetails
        }, 500);
    }
});

/**
 * POST /api/integrations/ga4/sync
 * Manually trigger GA4 data sync
 */
app.post('/sync', async (c) => {
    try {
        const { projectId, propertyId, days = 30 } = await c.req.json();

        if (!projectId || !propertyId) {
            return c.json({ success: false, error: 'projectId and propertyId are required' }, 400);
        }

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
            tokenRecord.refreshToken
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
        console.error('GA4 sync error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to sync GA4 data',
        }, 500);
    }
});

export default app;
