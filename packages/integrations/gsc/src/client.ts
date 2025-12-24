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
     * Fetch ALL search analytics data with pagination
     * Automatically handles pagination to retrieve complete dataset
     */
    async fetchAllSearchAnalytics(
        options: Omit<FetchSearchAnalyticsOptions, 'startRow'>
    ): Promise<ParsedGSCData[]> {
        const allData: ParsedGSCData[] = [];
        let startRow = 0;
        const rowLimit = 25000; // GSC API max limit
        let pageNumber = 1;

        console.log(`[GSC Client] Fetching all data for ${options.siteUrl} (${options.startDate} to ${options.endDate})`);

        while (true) {
            console.log(`[GSC Client] Fetching page ${pageNumber} (startRow: ${startRow})...`);

            const batch = await this.fetchSearchAnalytics({
                ...options,
                rowLimit,
                startRow,
            });

            if (batch.length === 0) {
                console.log(`[GSC Client] No more data. Total rows fetched: ${allData.length}`);
                break;
            }

            allData.push(...batch);
            console.log(`[GSC Client] Page ${pageNumber}: ${batch.length} rows (Total: ${allData.length})`);

            // If we got fewer rows than the limit, we've reached the end
            if (batch.length < rowLimit) {
                console.log(`[GSC Client] Last page reached. Total rows fetched: ${allData.length}`);
                break;
            }

            startRow += rowLimit;
            pageNumber++;

            // Safety check to prevent infinite loops
            if (pageNumber > 100) {
                console.warn(`[GSC Client] Safety limit reached (100 pages). Stopping pagination.`);
                break;
            }
        }

        return allData;
    }

    /**
     * Helper to chunk date range into smaller periods
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @param chunkDays - Number of days per chunk
     * @returns Array of date range chunks
     */
    private chunkDateRange(
        startDate: string,
        endDate: string,
        chunkDays: number
    ): Array<{ startDate: string; endDate: string }> {
        const chunks: Array<{ startDate: string; endDate: string }> = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        let currentStart = new Date(start);

        while (currentStart <= end) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + chunkDays - 1);

            // Don't exceed the original end date
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

    /**
     * Fetch all data with date chunking and pagination
     * Best for large date ranges that may exceed API limits
     */
    async fetchAllWithChunking(
        options: Omit<FetchSearchAnalyticsOptions, 'startRow'>,
        chunkDays: number = 7
    ): Promise<ParsedGSCData[]> {
        const chunks = this.chunkDateRange(options.startDate, options.endDate, chunkDays);
        const allData: ParsedGSCData[] = [];

        console.log(`[GSC Client] Fetching data in ${chunks.length} chunks (${chunkDays} days each)`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[GSC Client] Processing chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);

            try {
                const chunkData = await this.fetchAllSearchAnalytics({
                    ...options,
                    startDate: chunk.startDate,
                    endDate: chunk.endDate,
                });

                allData.push(...chunkData);
                console.log(`[GSC Client] Chunk ${i + 1} complete: ${chunkData.length} rows (Total: ${allData.length})`);
            } catch (error: any) {
                console.error(`[GSC Client] Error fetching chunk ${i + 1}:`, error.message);
                // Continue with next chunk instead of failing completely
            }
        }

        console.log(`[GSC Client] All chunks complete. Total rows: ${allData.length}`);
        return allData;
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
