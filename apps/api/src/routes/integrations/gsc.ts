import { Hono } from 'hono';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { db, oauthTokens, gscData, gscSites, eq, sql, and } from '@repo/db';
import crypto from 'crypto';
import { getValidAccessToken } from '../../utils/token-refresh';
import { encryptToken, decryptTokenValue } from '../../utils/crypto-tokens';
import { logger } from '../../utils/logger';

const log = logger.child('GSC');

// Inline GSCClient to avoid monorepo import issues
class GSCClient {
    private oauth2Client: Auth.OAuth2Client;
    private searchconsole: ReturnType<typeof google.searchconsole>;

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
        this.searchconsole = google.searchconsole({ version: 'v1', auth: this.oauth2Client });
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

        log.info(`Fetching all data for ${options.siteUrl} (${options.startDate} to ${options.endDate})`);

        while (true) {
            log.info(`Fetching page ${pageNumber} (startRow: ${startRow})...`);

            const batch = await this.fetchSearchAnalytics({
                ...options,
                rowLimit,
                startRow,
            });

            if (batch.length === 0) {
                log.info(`No more data. Total rows fetched: ${allData.length}`);
                break;
            }

            allData.push(...batch);
            log.info(`Page ${pageNumber}: ${batch.length} rows (Total: ${allData.length})`);

            if (batch.length < rowLimit) {
                log.info(`Last page reached. Total rows fetched: ${allData.length}`);
                break;
            }

            startRow += rowLimit;
            pageNumber++;

            if (pageNumber > 100) {
                log.warn(`Safety limit reached (100 pages). Stopping pagination.`);
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

            if (currentEnd > end) {
                currentEnd.setTime(end.getTime());
            }

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

        log.info(`Fetching data in ${chunks.length} chunks (${chunkDays} days each)`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            log.info(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);

            try {
                const chunkData = await this.fetchAllSearchAnalytics({
                    ...options,
                    startDate: chunk.startDate,
                    endDate: chunk.endDate,
                });

                allData.push(...chunkData);
                log.info(`Chunk ${i + 1} complete: ${chunkData.length} rows (Total: ${allData.length})`);
            } catch (error: any) {
                log.error(`Error fetching chunk ${i + 1}:`, error);
            }
        }

        log.info(`All chunks complete. Total rows: ${allData.length}`);
        return allData;
    }
}

const app = new Hono();

// OAuth configuration - GSC uses its own redirect URI
const getOAuthConfig = () => {
    const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI!;

    log.info(`Using redirect URI: ${redirectUri}`);

    return {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri,
        scopes: [
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid',
        ],
    };
};

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
        log.error('GSC authorize error:', error);
        return c.json({ success: false, error: 'Failed to generate authorization URL' }, 500);
    }
});

/**
 * GET /api/integrations/gsc/callback
 * Handles OAuth callback from Google
 */
app.get('/callback', async (c) => {
    try {
        log.info('Starting callback processing...');
        const { code, state, error } = c.req.query();

        // Handle OAuth error
        if (error) {
            log.error(`OAuth error received: ${error}`);
            return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=${encodeURIComponent(error)}`);
        }

        if (!code) {
            log.error('No code received');
            return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=no_code`);
        }

        log.info(`Code received, length: ${code.length}`);
        log.info(`State received: ${state}`);

        // Parse state to get projectId
        let projectId: number;
        try {
            if (!state) {
                throw new Error('State parameter missing');
            }
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            log.info(`Parsed state data: ${JSON.stringify(stateData)}`);
            projectId = parseInt(stateData.projectId);

            if (!projectId || isNaN(projectId)) {
                throw new Error('Invalid projectId in state');
            }
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

        // Exchange code for tokens
        log.info('Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        log.info(`Tokens received. Access token exists: ${!!tokens.access_token}`);

        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Missing tokens from Google OAuth');
        }

        // Get user info (email)
        log.info('Fetching user info...');
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
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
                    eq(oauthTokens.provider, 'google_search_console')
                )
            )
            .limit(1);

        log.info(`Existing token found: ${existingToken.length > 0}`);

        if (existingToken.length > 0) {
            // Update existing token
            log.info('Updating existing token...');
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
            log.info('Inserting new token...');
            await db.insert(oauthTokens).values({
                projectId,
                provider: 'google_search_console',
                accessToken: encryptToken(tokens.access_token),
                refreshToken: encryptToken(tokens.refresh_token),
                expiresAt: new Date(tokens.expiry_date!),
                tokenType: tokens.token_type || 'Bearer',
                scope: tokens.scope || '',
                accountEmail,
            });
        }

        log.info(`GSC connected successfully for project ${projectId}`);

        // Redirect back to integrations page with success
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?success=gsc_connected`;
        log.info(`Redirecting to: ${redirectUrl}`);
        return c.redirect(redirectUrl);
    } catch (error: any) {
        log.error('GSC callback error:', error);
        return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/integrations?error=connection_failed`);
    }
});

/**
 * GET /api/integrations/gsc/sites
 * Discover and list available GSC sites
 */
app.get('/sites', async (c) => {
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
                    eq(oauthTokens.provider, 'google_search_console')
                )
            )
            .limit(1);

        if (!tokenRecord) {
            return c.json({ success: false, error: 'GSC not connected' }, 404);
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

        // List sites
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
        const response = await searchconsole.sites.list();

        const sites = response.data.siteEntry || [];

        // Optionally save to database
        if (save === 'true' && sites.length > 0) {
            for (const site of sites) {
                // Check if site already exists
                const existing = await db
                    .select()
                    .from(gscSites)
                    .where(
                        and(
                            eq(gscSites.projectId, parseInt(projectId)),
                            eq(gscSites.siteUrl, site.siteUrl!)
                        )
                    )
                    .limit(1);

                if (existing.length === 0) {
                    // Insert new site
                    await db.insert(gscSites).values({
                        projectId: parseInt(projectId),
                        siteUrl: site.siteUrl!,
                        permissionLevel: site.permissionLevel || null,
                    });
                }
            }
        }

        return c.json({
            success: true,
            data: {
                sites: sites.map(s => ({
                    siteUrl: s.siteUrl,
                    permissionLevel: s.permissionLevel,
                })),
                saved: save === 'true',
            },
        });
    } catch (error: any) {
        log.error('GSC sites discovery error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to discover GSC sites',
        }, 500);
    }
});

/**
 * POST /api/integrations/gsc/sync
 * Manually trigger GSC data sync
 */
app.post('/sync', async (c) => {
    try {
        const { projectId, siteUrl, days: rawDays = 30 } = await c.req.json();

        if (!projectId || !siteUrl) {
            return c.json({ success: false, error: 'projectId and siteUrl are required' }, 400);
        }

        const days = Math.min(Math.max(parseInt(rawDays) || 30, 1), 365);

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
            decryptTokenValue(tokenRecord.refreshToken)
        );

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        log.info(`Starting sync for project ${projectId}, site: ${siteUrl}`);
        log.info(`Date range: ${formatDate(startDate)} to ${formatDate(endDate)} (${days} days)`);

        // Fetch data from GSC with pagination and chunking
        const data = await gscClient.fetchAllWithChunking({
            siteUrl,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['date', 'page', 'query', 'country', 'device'],
        }, 7); // 7-day chunks

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

        // Record successful sync timestamp
        await db
            .update(oauthTokens)
            .set({ lastSyncedAt: new Date() })
            .where(and(eq(oauthTokens.projectId, projectId), eq(oauthTokens.provider, 'google_search_console')));

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
        log.error('GSC sync error:', error);
        return c.json({
            success: false,
            error: error.message || 'Failed to sync GSC data',
        }, 500);
    }
});

export default app;
