import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { GA4MetricQuery, GA4Response } from './types';

/**
 * Google Analytics 4 API Client
 * Provides methods to interact with GA4 Data API
 */
export class GA4Client {
    private analyticsDataClient: BetaAnalyticsDataClient;
    private propertyId: string;

    constructor(credentials: any, propertyId: string) {
        this.analyticsDataClient = new BetaAnalyticsDataClient({
            credentials,
        });
        this.propertyId = propertyId;
    }

    /**
     * Run a report query
     * @param query - Metric query parameters
     * @returns GA4 response data
     */
    async runReport(query: GA4MetricQuery): Promise<GA4Response> {
        const [response] = await this.analyticsDataClient.runReport({
            property: query.propertyId || `properties/${this.propertyId}`,
            dateRanges: [
                {
                    startDate: query.startDate,
                    endDate: query.endDate,
                },
            ],
            metrics: query.metrics.map((name: string) => ({ name })),
            dimensions: query.dimensions?.map((name: string) => ({ name })),
            limit: query.limit || 10000,
        });

        return {
            rows: response.rows?.map((row) => ({
                dimensionValues: row.dimensionValues || [],
                metricValues: row.metricValues || [],
            })) || [],
            rowCount: response.rowCount || 0,
            metadata: response.metadata,
        };
    }

    /**
     * Get common metrics (sessions, users, pageviews, etc.)
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @param dimensions - Optional dimensions to group by
     * @returns GA4 response with common metrics
     */
    async getCommonMetrics(
        startDate: string,
        endDate: string,
        dimensions?: string[]
    ): Promise<GA4Response> {
        return this.runReport({
            propertyId: `properties/${this.propertyId}`,
            startDate,
            endDate,
            metrics: [
                'sessions',
                'totalUsers',
                'screenPageViews',
                'averageSessionDuration',
                'bounceRate',
            ],
            dimensions,
        });
    }

    /**
     * Get page-specific metrics
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @param pagePath - Optional page path filter
     * @returns GA4 response with page metrics
     */
    async getPageMetrics(
        startDate: string,
        endDate: string
    ): Promise<GA4Response> {
        const query: GA4MetricQuery = {
            propertyId: `properties/${this.propertyId}`,
            startDate,
            endDate,
            metrics: ['screenPageViews', 'averageSessionDuration', 'bounceRate'],
            dimensions: ['pagePath', 'pageTitle'],
        };

        // TODO: Add dimension filter for pagePath when specified

        return this.runReport(query);
    }

    /**
     * Get traffic source metrics
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @returns GA4 response with traffic source data
     */
    async getTrafficSources(
        startDate: string,
        endDate: string
    ): Promise<GA4Response> {
        return this.runReport({
            propertyId: `properties/${this.propertyId}`,
            startDate,
            endDate,
            metrics: ['sessions', 'totalUsers', 'screenPageViews'],
            dimensions: ['sessionSource', 'sessionMedium', 'sessionCampaignName'],
        });
    }
}
