import { db, oauthTokens, gscData, gscSites, eq, sql, and } from '@repo/db';
import { google } from 'googleapis';
import { getValidAccessToken } from '../utils/token-refresh';

// Inline GSCClient for backfill script
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
        const configuredSite = await db
            .select()
            .from(gscSites)
            .where(eq(gscSites.projectId, projectId))
            .limit(1);

        if (configuredSite.length > 0) {
            return configuredSite[0].siteUrl;
        }

        try {
            const response = await this.searchconsole.sites.list();
            const sites = response.data.siteEntry || [];

            if (sites.length === 0) {
                console.warn(`[Backfill] No sites found for project ${projectId}`);
                return null;
            }

            const domainProperty = sites.find((s: any) => s.siteUrl?.startsWith('sc-domain:'));
            const selectedSite = domainProperty || sites[0];

            console.log(`[Backfill] Auto-discovery for project ${projectId}: Selected ${selectedSite.siteUrl}`);
            return selectedSite.siteUrl || null;
        } catch (error) {
            console.error(`[Backfill] Error listing sites for project ${projectId}:`, error);
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

        console.log(`[Backfill] Fetching all data for ${options.siteUrl} (${options.startDate} to ${options.endDate})`);

        while (true) {
            console.log(`[Backfill] Page ${pageNumber} (startRow: ${startRow})...`);

            const batch = await this.fetchSearchAnalytics({
                ...options,
                rowLimit,
                startRow,
            });

            if (batch.length === 0) {
                console.log(`[Backfill] No more data. Total: ${allData.length}`);
                break;
            }

            allData.push(...batch);
            console.log(`[Backfill] Page ${pageNumber}: ${batch.length} rows (Total: ${allData.length})`);

            if (batch.length < rowLimit) {
                console.log(`[Backfill] Last page. Total: ${allData.length}`);
                break;
            }

            startRow += rowLimit;
            pageNumber++;

            if (pageNumber > 100) {
                console.warn(`[Backfill] Safety limit (100 pages). Stopping.`);
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

        console.log(`[Backfill] Fetching in ${chunks.length} chunks (${chunkDays} days each)`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[Backfill] Chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);

            try {
                const chunkData = await this.fetchAllSearchAnalytics({
                    ...options,
                    startDate: chunk.startDate,
                    endDate: chunk.endDate,
                });

                allData.push(...chunkData);
                console.log(`[Backfill] Chunk ${i + 1} complete: ${chunkData.length} rows (Total: ${allData.length})`);
            } catch (error: any) {
                console.error(`[Backfill] Error in chunk ${i + 1}:`, error.message);
            }
        }

        console.log(`[Backfill] All chunks complete. Total: ${allData.length}`);
        return allData;
    }
}

/**
 * Backfill GSC data for a specific project
 */
async function backfillProject(projectId: number, startDate: string, endDate: string, dryRun: boolean = false, chunkDays: number = 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Backfilling project ${projectId}`);
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    console.log(`📦 Chunk size: ${chunkDays} day(s)`);
    console.log(`${dryRun ? '🧪 DRY RUN MODE' : '💾 LIVE MODE'}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Get OAuth token
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
            console.error(`❌ No GSC connection found for project ${projectId}`);
            return;
        }

        // Get valid access token
        const validAccessToken = await getValidAccessToken(tokenRecord);
        const client = new GSCClient(validAccessToken, tokenRecord.refreshToken);

        // Get site URL
        const siteUrl = await client.getOrDiscoverSiteUrl(projectId);
        if (!siteUrl) {
            console.error(`❌ No site URL found for project ${projectId}`);
            return;
        }

        console.log(`✅ Site URL: ${siteUrl}\n`);

        // Split into chunks
        const chunks = client['chunkDateRange'](startDate, endDate, chunkDays);
        console.log(`📊 Processing ${chunks.length} chunks...\n`);

        let totalRowsProcessed = 0;
        let totalRowsInserted = 0;

        // Process each chunk separately
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`📦 Chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);
            console.log(`${'─'.repeat(60)}`);

            try {
                // Fetch data for this chunk with pagination
                const data = await client.fetchAllSearchAnalytics({
                    siteUrl,
                    startDate: chunk.startDate,
                    endDate: chunk.endDate,
                });

                if (data.length === 0) {
                    console.log(`⚠️  No data for this chunk`);
                    continue;
                }

                totalRowsProcessed += data.length;
                console.log(`\n✅ Fetched ${data.length} rows for this chunk`);

                if (dryRun) {
                    console.log(`🧪 DRY RUN - Would insert ${data.length} rows`);
                    if (i === 0) {
                        console.log(`\nSample data (first 2 rows):`);
                        console.log(JSON.stringify(data.slice(0, 2), null, 2));
                    }
                    continue;
                }

                // Insert data in batches
                const batchSize = 1000;
                let chunkInserted = 0;

                console.log(`💾 Inserting ${data.length} rows in batches of ${batchSize}...`);

                for (let j = 0; j < data.length; j += batchSize) {
                    const batch = data.slice(j, j + batchSize);
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

                    chunkInserted += rows.length;
                    const progress = ((chunkInserted / data.length) * 100).toFixed(1);
                    process.stdout.write(`\r  Progress: ${chunkInserted}/${data.length} (${progress}%)`);
                }

                totalRowsInserted += chunkInserted;
                console.log(`\n✅ Chunk ${i + 1} complete: ${chunkInserted} rows inserted`);

            } catch (error: any) {
                console.error(`\n❌ Error in chunk ${i + 1}:`, error.message);
                // Continue with next chunk
            }
        }

        console.log(`\n\n${'='.repeat(60)}`);
        if (dryRun) {
            console.log(`🧪 DRY RUN COMPLETE`);
            console.log(`📊 Total rows that would be inserted: ${totalRowsProcessed}`);
        } else {
            console.log(`✅ BACKFILL COMPLETE!`);
            console.log(`📊 Total rows processed: ${totalRowsProcessed}`);
            console.log(`💾 Total rows inserted/updated: ${totalRowsInserted}`);
        }
        console.log(`${'='.repeat(60)}\n`);

    } catch (error: any) {
        console.error(`\n❌ Backfill failed:`, error.message);
        if (error.stack) console.error(error.stack);
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
📚 GSC Data Backfill Script

Usage:
  npm run backfill-gsc -- <projectId> <startDate> <endDate> [--dry-run] [--chunk-days=N]

Examples:
  npm run backfill-gsc -- 27 2025-09-24 2025-12-21
  npm run backfill-gsc -- 27 2025-09-24 2025-12-21 --dry-run
  npm run backfill-gsc -- 27 2025-09-24 2025-12-21 --chunk-days=1

Arguments:
  projectId      - Project ID to backfill
  startDate      - Start date (YYYY-MM-DD)
  endDate        - End date (YYYY-MM-DD)
  --dry-run      - Test mode (no database writes)
  --chunk-days=N - Chunk size in days (default: 1)
        `);
        process.exit(0);
    }

    const projectId = parseInt(args[0]);
    const startDate = args[1];
    const endDate = args[2];
    const dryRun = args.includes('--dry-run');

    // Parse chunk days
    let chunkDays = 1; // Default to 1 day for safety
    const chunkArg = args.find(arg => arg.startsWith('--chunk-days='));
    if (chunkArg) {
        chunkDays = parseInt(chunkArg.split('=')[1]);
    }

    if (isNaN(projectId)) {
        console.error('❌ Invalid project ID');
        process.exit(1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
    }

    await backfillProject(projectId, startDate, endDate, dryRun, chunkDays);
    process.exit(0);
}

main();
