import { CronJob } from 'cron';
import { google } from 'googleapis';
import { db, oauthTokens, gscData, gscSites, eq, sql } from '@repo/db';
import { getValidAccessToken } from '../utils/token-refresh';

// Inline GSCClient for cron job
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

    async getOrDiscoverSiteUrl(projectId: number): Promise<string | null> {
        // 1. Check DB for configured site
        const configuredSite = await db
            .select()
            .from(gscSites)
            .where(eq(gscSites.projectId, projectId))
            .limit(1);

        if (configuredSite.length > 0) {
            return configuredSite[0].siteUrl;
        }

        // 2. If not found, list sites from API
        try {
            const response = await this.searchconsole.sites.list();
            const sites = response.data.siteEntry || [];

            // Filter for verified sites only? Usually safe to assume if in list we have some access
            // But let's prioritize 'siteOwner' if possible, or just take the first one.

            if (sites.length === 0) {
                console.warn(`[GSC Client] No sites found for project ${projectId}`);
                return null;
            }

            // Improve auto-discovery: If multiple sites, prefer 'sc-domain:' (Domain Property)
            // If no domain property, take the first one.
            // Log what we found to help debugging.

            const domainProperty = sites.find((s: any) => s.siteUrl?.startsWith('sc-domain:'));
            const selectedSite = domainProperty || sites[0];

            console.log(`[GSC Client] Auto-discovery for project ${projectId}: Found ${sites.length} sites.`);
            console.log(`[GSC Client] Selected site: ${selectedSite.siteUrl} ${domainProperty ? '(Domain Property)' : '(First available)'}`);

            return selectedSite.siteUrl || null;

        } catch (error) {
            console.error(`[GSC Client] Error listing sites for project ${projectId}:`, error);
            return null;
        }
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
            const batch = await this.fetchSearchAnalytics({
                ...options,
                rowLimit,
                startRow,
            });

            if (batch.length === 0) break;

            allData.push(...batch);

            if (batch.length < rowLimit) break;

            startRow += rowLimit;
            pageNumber++;

            if (pageNumber > 100) {
                console.warn(`[GSC Cron] Safety limit reached (100 pages). Stopping pagination.`);
                break;
            }
        }

        return allData;
    }
}

/**
 * Run GSC Sync Logic
 */
export const runGSCSync = async () => {
    console.log('🔄 [GSC Cron] Starting daily GSC sync...');

    try {
        // Get all GSC connections
        const connections = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google_search_console'));

        console.log(`[GSC Cron] Found ${connections.length} GSC connections`);

        // Calculate yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        for (const connection of connections) {
            try {
                console.log(`[GSC Cron] Syncing project ${connection.projectId}...`);

                // Get valid access token (auto-refresh if expired)
                const validAccessToken = await getValidAccessToken(connection);

                const client = new GSCClient(validAccessToken, connection.refreshToken);

                // Auto-discover siteUrl
                const siteUrl = await client.getOrDiscoverSiteUrl(connection.projectId);

                if (!siteUrl) {
                    console.error(`❌ [GSC Cron] No siteUrl found for project ${connection.projectId}. Skipping.`);
                    continue;
                }

                console.log(`[GSC Cron] Fetching data for site: ${siteUrl}, date: ${dateStr}`);

                const data = await client.fetchAllSearchAnalytics({
                    siteUrl,
                    startDate: dateStr,
                    endDate: dateStr,
                });

                if (data.length === 0) {
                    console.log(`⚠️ [GSC Cron] No data available for project ${connection.projectId} on ${dateStr}`);
                    continue;
                }

                // Batch insert/upsert
                const batchSize = 1000;
                let totalInserted = 0;

                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);
                    const rows = batch.map((row: any) => ({
                        projectId: connection.projectId,
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

                console.log(`✅ [GSC Cron] Synced ${totalInserted} rows for project ${connection.projectId}`);

            } catch (error: any) {
                console.error(`❌ [GSC Cron] Error syncing project ${connection.projectId}:`, error.message);
            }
        }

        console.log('✅ [GSC Cron] Daily GSC sync completed');
    } catch (error) {
        console.error('❌ [GSC Cron] Error in GSC sync job:', error);
    }
};

/**
 * GSC Sync Cron Job
 * Runs daily at 2:00 AM
 * Syncs yesterday's GSC data for all connected projects
 */
export const gscSyncJob = new CronJob(
    '0 2 * * *', // Run at 2:00 AM every day
    runGSCSync,
    null,
    false, // Don't auto-start
    'Asia/Ho_Chi_Minh' // Vietnam timezone
);

/**
 * Start the GSC sync cron job
 */
export function startGSCSyncJob() {
    gscSyncJob.start();
    console.log('📅 [GSC Cron] GSC sync job scheduled for 2:00 AM daily');
}

/**
 * Stop the GSC sync cron job
 */
export function stopGSCSyncJob() {
    gscSyncJob.stop();
    console.log('🛑 [GSC Cron] GSC sync job stopped');
}
