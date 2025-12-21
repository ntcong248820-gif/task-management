import { Hono } from 'hono';
import { google } from 'googleapis';
import { db, oauthTokens, gscData, eq, sql, and } from '@repo/db';
import crypto from 'crypto';
import { getValidAccessToken } from '../../utils/token-refresh';

// Inline GSCClient to avoid monorepo import issues
class GSCClient {
    private oauth2Client: any;
    private searchconsole: any;

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
        this.searchconsole = google.searchconsole({ version: 'v1', auth: this.oauth2Client });
    }

    async fetchSearchAnalytics(options: any) {
        const { siteUrl, startDate, endDate, dimensions = ['date', 'page', 'query', 'country', 'device'], rowLimit = 25000 } = options;
        const response = await this.searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: { startDate, endDate, dimensions, rowLimit, dimensionFilterGroups: [] },
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
}

const app = new Hono();

// OAuth configuration
const getOAuthConfig = () => ({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    scopes: [
        'https://www.googleapis.com/auth/webmasters.readonly',
    ],
});

/**
 * GET /api/integrations/gsc/authorize
 * Initiates OAuth flow for Google Search Console
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
            integration: 'gsc',
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
        console.error('GSC authorize error:', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

/**
 * GET /api/integrations/gsc/callback
 * Handles OAuth callback from Google
 */
app.get('/callback', async (c) => {
    try {
        const { code, error } = c.req.query();

        // Handle OAuth error
        if (error) {
            return c.json({ success: false, error: `OAuth error: ${error}` }, 400);
        }

        if (!code) {
            return c.json({ success: false, error: 'Authorization code is required' }, 400);
        }

        // TODO: Verify state for CSRF protection

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            getOAuthConfig().clientId,
            getOAuthConfig().clientSecret,
            getOAuthConfig().redirectUri
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Get user info (email)
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const accountEmail = userInfo.data.email || null;

        // TODO: Get projectId from state storage
        const projectId = 1; // Temporary - should come from state

        // Store tokens in database
        await db.insert(oauthTokens).values({
            projectId,
            provider: 'google_search_console',
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiresAt: new Date(tokens.expiry_date!),
            tokenType: tokens.token_type!,
            scope: tokens.scope!,
            accountEmail,
        });

        // Return success - frontend will handle redirect
        return c.json({ success: true, message: 'Google Search Console connected successfully' });
    } catch (error) {
        console.error('GSC callback error:', error);
        return c.json({ success: false, error: 'Failed to connect Google Search Console' }, 500);
    }
});

/**
 * POST /api/integrations/gsc/sync
 * Manually trigger GSC data sync
 */
app.post('/sync', async (c) => {
    try {
        const { projectId, siteUrl, days = 30 } = await c.req.json();

        if (!projectId || !siteUrl) {
            return c.json({ success: false, error: 'projectId and siteUrl are required' }, 400);
        }

        // Get OAuth tokens
        const [tokenRecord] = await db
            .select()
            .from(oauthTokens)
            .where(
                and(
                    eq(oauthTokens.projectId, projectId),
                    eq(oauthTokens.provider, 'google_search_console')
                )
            )
            .limit(1);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GSC not connected' }, 404);
        }

        // Get valid access token (auto-refresh if expired)
        const validAccessToken = await getValidAccessToken(tokenRecord);

        // Initialize GSC client with valid token
        const gscClient = new GSCClient(
            validAccessToken,
            tokenRecord.refreshToken
        );

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        // Fetch data from GSC
        const data = await gscClient.fetchSearchAnalytics({
            siteUrl,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['date', 'page', 'query', 'country', 'device'],
            rowLimit: 25000,
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
                page: row.page,
                query: row.query,
                country: row.country,
                device: row.device,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr.toString(),
                position: row.position.toString(),
            }));

            // Upsert (insert or update on conflict)
            await db
                .insert(gscData)
                .values(rows)
                .onConflictDoUpdate({
                    target: [
                        gscData.projectId,
                        gscData.date,
                        gscData.page,
                        gscData.query,
                        gscData.country,
                        gscData.device,
                    ],
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
        console.error('GSC sync error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to sync GSC data',
        }, 500);
    }
});

export default app;
