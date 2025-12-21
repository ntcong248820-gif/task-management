import { CronJob } from 'cron';
import { google } from 'googleapis';
import { db, oauthTokens, ga4Data, eq, sql, and } from '@repo/db';
import { getValidAccessToken } from '../utils/token-refresh';

// Inline GA4Client for cron job
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
        this.analyticsdata = google.analyticsdata('v1beta');
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

/**
 * GA4 Sync Cron Job
 * Runs daily at 2:30 AM
 * Syncs yesterday's GA4 data for all connected projects
 */
export const ga4SyncJob = new CronJob(
    '30 2 * * *', // Run at 2:30 AM every day
    async () => {
        console.log('🔄 [GA4 Cron] Starting daily GA4 sync...');

        try {
            // Get all GA4 connections
            const connections = await db
                .select()
                .from(oauthTokens)
                .where(eq(oauthTokens.provider, 'google_analytics'));

            console.log(`[GA4 Cron] Found ${connections.length} GA4 connections`);

            // Calculate yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            for (const connection of connections) {
                try {
                    console.log(`[GA4 Cron] Syncing project ${connection.projectId}...`);

                    // Get valid access token (auto-refresh if expired)
                    const validAccessToken = await getValidAccessToken(connection);

                    const client = new GA4Client(validAccessToken, connection.refreshToken);

                    // TODO: Get propertyId from project settings or ga4_properties table
                    // For now, we'll need to store propertyId somewhere
                    // const propertyId = await getPropertyIdForProject(connection.projectId);

                    // Example: sync data (uncomment when propertyId is available)
                    // const data = await client.fetchAnalyticsData({
                    //     propertyId,
                    //     startDate: dateStr,
                    //     endDate: dateStr,
                    // });

                    // console.log(`✅ [GA4 Cron] Synced ${data.length} rows for project ${connection.projectId}`);
                    console.log(`✅ [GA4 Cron] Project ${connection.projectId} token valid, ready for sync`);

                } catch (error: any) {
                    console.error(`❌ [GA4 Cron] Error syncing project ${connection.projectId}:`, error.message);
                }
            }

            console.log('✅ [GA4 Cron] Daily GA4 sync completed');
        } catch (error) {
            console.error('❌ [GA4 Cron] Error in GA4 sync job:', error);
        }
    },
    null,
    false, // Don't auto-start
    'Asia/Ho_Chi_Minh' // Vietnam timezone
);

/**
 * Start the GA4 sync cron job
 */
export function startGA4SyncJob() {
    ga4SyncJob.start();
    console.log('📅 [GA4 Cron] GA4 sync job scheduled for 2:30 AM daily');
}

/**
 * Stop the GA4 sync cron job
 */
export function stopGA4SyncJob() {
    ga4SyncJob.stop();
    console.log('🛑 [GA4 Cron] GA4 sync job stopped');
}
