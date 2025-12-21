import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

/**
 * GSC Search Analytics Row
 */
export interface GSCSearchAnalyticsRow {
    keys: string[]; // [date, page, query, country, device]
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

/**
 * GSC Search Analytics Response
 */
export interface GSCSearchAnalyticsResponse {
    rows?: GSCSearchAnalyticsRow[];
    responseAggregationType?: string;
}

/**
 * Fetch Options
 */
export interface FetchSearchAnalyticsOptions {
    siteUrl: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    dimensions?: string[];
    rowLimit?: number;
    startRow?: number;
}

/**
 * Parsed GSC Data
 */
export interface ParsedGSCData {
    date: string;
    page: string;
    query: string;
    country: string;
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

/**
 * GSC Client
 * Handles Google Search Console API interactions
 */
export class GSCClient {
    private oauth2Client: OAuth2Client;
    private searchconsole: any;

    constructor(accessToken: string, refreshToken: string) {
        // Initialize OAuth2 client
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.GOOGLE_REDIRECT_URI!
        );

        // Set credentials
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        // Initialize Search Console API
        this.searchconsole = google.searchconsole({
            version: 'v1',
            auth: this.oauth2Client,
        });
    }

    /**
     * Fetch search analytics data from GSC
     */
    async fetchSearchAnalytics(
        options: FetchSearchAnalyticsOptions
    ): Promise<ParsedGSCData[]> {
        const {
            siteUrl,
            startDate,
            endDate,
            dimensions = ['date', 'page', 'query', 'country', 'device'],
            rowLimit = 25000,
            startRow = 0,
        } = options;

        try {
            const response = await this.searchconsole.searchanalytics.query({
                siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions,
                    rowLimit,
                    startRow,
                    dimensionFilterGroups: [],
                },
            });

            const data: GSCSearchAnalyticsResponse = response.data;

            if (!data.rows || data.rows.length === 0) {
                return [];
            }

            // Parse and transform data
            return data.rows.map((row) => this.parseRow(row, dimensions));
        } catch (error: any) {
            console.error('GSC API Error:', error.message);

            // Handle token expiration
            if (error.code === 401) {
                throw new Error('OAuth token expired. Please reconnect.');
            }

            throw error;
        }
    }

    /**
     * Parse a single row from GSC API response
     */
    private parseRow(
        row: GSCSearchAnalyticsRow,
        dimensions: string[]
    ): ParsedGSCData {
        const dimensionMap: Record<string, string> = {};

        dimensions.forEach((dim, index) => {
            dimensionMap[dim] = row.keys[index] || 'all';
        });

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
    }

    /**
     * Get list of verified sites
     */
    async getVerifiedSites(): Promise<string[]> {
        try {
            const response = await this.searchconsole.sites.list();
            const sites = response.data.siteEntry || [];

            return sites
                .filter((site: any) => site.permissionLevel !== 'siteUnverifiedUser')
                .map((site: any) => site.siteUrl);
        } catch (error: any) {
            console.error('Failed to get verified sites:', error.message);
            throw error;
        }
    }
}
