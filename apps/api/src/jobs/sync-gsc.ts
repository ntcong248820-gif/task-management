import { CronJob } from 'cron';
import { google } from 'googleapis';
import { db, oauthTokens, gscData, eq, sql, and } from '@repo/db';
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

/**
 * GSC Sync Cron Job
 * Runs daily at 2:00 AM
 * Syncs yesterday's GSC data for all connected projects
 */
export const gscSyncJob = new CronJob(
    '0 2 * * *', // Run at 2:00 AM every day
    async () => {
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

                    // TODO: Get siteUrl from project settings or gsc_sites table
                    // For now, we'll need to store siteUrl somewhere
                    // const siteUrl = await getSiteUrlForProject(connection.projectId);

                    // Example: sync data (uncomment when siteUrl is available)
                    // const data = await client.fetchSearchAnalytics({
                    //     siteUrl,
                    //     startDate: dateStr,
                    //     endDate: dateStr,
                    //     rowLimit: 25000,
                    // });

                    // console.log(`✅ [GSC Cron] Synced ${data.length} rows for project ${connection.projectId}`);
                    console.log(`✅ [GSC Cron] Project ${connection.projectId} token valid, ready for sync`);

                } catch (error: any) {
                    console.error(`❌ [GSC Cron] Error syncing project ${connection.projectId}:`, error.message);
                }
            }

            console.log('✅ [GSC Cron] Daily GSC sync completed');
        } catch (error) {
            console.error('❌ [GSC Cron] Error in GSC sync job:', error);
        }
    },
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
