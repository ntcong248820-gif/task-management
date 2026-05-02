import { CronJob } from 'cron';
import { google } from 'googleapis';
import type { Auth } from 'googleapis';
import { db, oauthTokens, ga4Data, ga4Properties, eq, sql, and } from '@repo/db';
import { getValidAccessToken } from '../utils/token-refresh';
import { decryptTokenValue } from '../utils/crypto-tokens';
import { logger } from '../utils/logger';

const log = logger.child('GA4-Cron');

// Inline GA4Client for cron job
class GA4Client {
    private oauth2Client: Auth.OAuth2Client;
    private analyticsdata: ReturnType<typeof google.analyticsdata>;

    constructor(accessToken: string, refreshToken: string) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.GOOGLE_GA4_REDIRECT_URI!
        );
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        this.analyticsdata = google.analyticsdata('v1beta');
    }

    async getOrDiscoverPropertyId(projectId: number): Promise<string | null> {
        // 1. Check DB for configured property
        const configuredProp = await db
            .select()
            .from(ga4Properties)
            .where(eq(ga4Properties.projectId, projectId))
            .limit(1);

        if (configuredProp.length > 0) {
            return configuredProp[0].propertyId;
        }

        // 2. If not found, discover from API and auto-save first property
        try {
            const admin = google.analyticsadmin({ version: 'v1beta', auth: this.oauth2Client });
            const response = await admin.accountSummaries.list();
            const summaries = response.data.accountSummaries || [];

            const allProperties: any[] = [];
            summaries.forEach((account: any) => {
                if (account.propertySummaries) allProperties.push(...account.propertySummaries);
            });

            if (allProperties.length === 0) {
                log.warn(`No properties found for project ${projectId}`);
                return null;
            }

            // Save all discovered properties to DB (user can pick later via /properties endpoint)
            for (const prop of allProperties) {
                const propertyId = prop.property?.split('/')[1];
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
                    log.info(`Auto-saved GA4 property ${propertyId} (${prop.displayName}) for project ${projectId}`);
                }
            }

            // Return first property ID (use first as default)
            const firstPropertyId = allProperties[0].property?.split('/')[1];
            log.info(`Auto-discovered ${allProperties.length} GA4 properties for project ${projectId}. Using: ${firstPropertyId}`);
            return firstPropertyId || null;

        } catch (error) {
            log.error(`Error listing properties for project ${projectId}:`, error);
            return null;
        }
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
 * Run GA4 Sync Logic
 */
export const runGA4Sync = async () => {
    log.info('Starting daily GA4 sync...');

    try {
        // Get all GA4 connections
        const connections = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google_analytics'));

        log.info(`Found ${connections.length} GA4 connections`);

        // Calculate yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        for (const connection of connections) {
            try {
                log.info(`Syncing project ${connection.projectId}...`);

                // Get valid access token (auto-refresh if expired)
                const validAccessToken = await getValidAccessToken(connection);

                const client = new GA4Client(validAccessToken, decryptTokenValue(connection.refreshToken));

                // Auto-discover propertyId
                const propertyId = await client.getOrDiscoverPropertyId(connection.projectId);

                if (!propertyId) {
                    log.error(`No propertyId found for project ${connection.projectId}. Skipping.`);
                    continue;
                }

                log.info(`Fetching data for property: ${propertyId}`);

                const data = await client.fetchAnalyticsData({
                    propertyId,
                    startDate: dateStr,
                    endDate: dateStr,
                });

                if (data.length === 0) {
                    log.warn(`No data available for project ${connection.projectId} on ${dateStr}`);
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

                log.info(`Synced ${totalInserted} rows for project ${connection.projectId}`);

            } catch (error: any) {
                log.error(`Error syncing project ${connection.projectId}:`, error);
            }
        }

        log.info('Daily GA4 sync completed');
    } catch (error) {
        log.error('Error in GA4 sync job:', error);
    }
};

/**
 * GA4 Sync Cron Job
 * Runs daily at 2:30 AM
 * Syncs yesterday's GA4 data for all connected projects
 */
export const ga4SyncJob = new CronJob(
    '30 2 * * *', // Run at 2:30 AM every day
    runGA4Sync,
    null,
    false, // Don't auto-start
    'Asia/Ho_Chi_Minh' // Vietnam timezone
);

/**
 * Start the GA4 sync cron job
 */
export function startGA4SyncJob() {
    ga4SyncJob.start();
    log.info('GA4 sync job scheduled for 2:30 AM daily');
}

/**
 * Stop the GA4 sync cron job
 */
export function stopGA4SyncJob() {
    ga4SyncJob.stop();
    log.info('GA4 sync job stopped');
}
