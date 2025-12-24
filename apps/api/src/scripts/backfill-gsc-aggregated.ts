import { db, oauthTokens, gscSites, eq, and, sql } from '@repo/db';
import { gscDataAggregated } from '@repo/db/src/schema/gsc_data_aggregated';
import { google } from 'googleapis';
import { getValidAccessToken } from '../utils/token-refresh';

/**
 * GSC Client for Aggregated Data
 * Fetches data with ONLY date dimension to match GSC dashboard
 */
class GSCClientAggregated {
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
                console.warn(`[Backfill Agg] No sites found for project ${projectId}`);
                return null;
            }

            const domainProperty = sites.find((s: any) => s.siteUrl?.startsWith('sc-domain:'));
            const selectedSite = domainProperty || sites[0];

            console.log(`[Backfill Agg] Auto-discovery for project ${projectId}: Selected ${selectedSite.siteUrl}`);
            return selectedSite.siteUrl || null;
        } catch (error) {
            console.error(`[Backfill Agg] Error listing sites for project ${projectId}:`, error);
            return null;
        }
    }

    /**
     * Fetch aggregated data with ONLY date dimension
     * This matches GSC dashboard and avoids over-counting
     */
    async fetchAggregatedData(siteUrl: string, startDate: string, endDate: string) {
        console.log(`[Backfill Agg] Fetching aggregated data: ${startDate} to ${endDate}`);

        const response = await this.searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions: ['date'], // ONLY date dimension
                type: 'web', // Filter to Web search only (matches GSC dashboard default)
                rowLimit: 25000, // Should be enough for date-only data
            },
        });

        const data = response.data;
        if (!data.rows || data.rows.length === 0) {
            console.log(`[Backfill Agg] No data returned`);
            return [];
        }

        console.log(`[Backfill Agg] Fetched ${data.rows.length} rows`);

        return data.rows.map((row: any) => ({
            date: row.keys[0],
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
        }));
    }

    /**
     * Chunk date range into smaller periods
     */
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

    /**
     * Fetch all aggregated data with chunking
     */
    async fetchAllAggregated(siteUrl: string, startDate: string, endDate: string, chunkDays: number = 30) {
        const chunks = this.chunkDateRange(startDate, endDate, chunkDays);
        const allData: any[] = [];

        console.log(`[Backfill Agg] Fetching in ${chunks.length} chunks (${chunkDays} days each)`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[Backfill Agg] Chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);

            try {
                const chunkData = await this.fetchAggregatedData(siteUrl, chunk.startDate, chunk.endDate);
                allData.push(...chunkData);
                console.log(`[Backfill Agg] Chunk ${i + 1} complete: ${chunkData.length} rows (Total: ${allData.length})`);
            } catch (error: any) {
                console.error(`[Backfill Agg] Error in chunk ${i + 1}:`, error.message);
            }
        }

        console.log(`[Backfill Agg] All chunks complete. Total: ${allData.length}`);
        return allData;
    }
}

/**
 * Backfill aggregated GSC data for a specific project
 */
async function backfillAggregatedData(projectId: number, startDate: string, endDate: string, dryRun: boolean = false) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Backfilling AGGREGATED GSC data for project ${projectId}`);
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
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
        const client = new GSCClientAggregated(validAccessToken, tokenRecord.refreshToken);

        // Get ALL sites for this project
        const sites = await db
            .select()
            .from(gscSites)
            .where(eq(gscSites.projectId, projectId));

        if (sites.length === 0) {
            console.error(`❌ No sites found for project ${projectId}`);
            return;
        }

        console.log(`✅ Found ${sites.length} site(s) for project ${projectId}:\n`);
        sites.forEach((site, idx) => {
            console.log(`   ${idx + 1}. ${site.siteUrl}`);
        });
        console.log('');

        let totalRowsAllSites = 0;

        // Process each site
        for (let i = 0; i < sites.length; i++) {
            const site = sites[i];
            const siteUrl = site.siteUrl;

            console.log(`\n${'─'.repeat(60)}`);
            console.log(`📍 Site ${i + 1}/${sites.length}: ${siteUrl}`);
            console.log(`${'─'.repeat(60)}\n`);

            try {
                // Fetch aggregated data (30-day chunks to avoid API limits)
                const data = await client.fetchAllAggregated(siteUrl, startDate, endDate, 30);

                if (data.length === 0) {
                    console.log(`⚠️ No data found for ${siteUrl}`);
                    continue;
                }

                console.log(`\n📊 Fetched ${data.length} rows for ${siteUrl}`);

                if (dryRun) {
                    console.log(`\n🧪 DRY RUN - Would insert ${data.length} rows`);
                    console.log(`Sample data (first 2 rows):`);
                    console.log(JSON.stringify(data.slice(0, 2), null, 2));
                    totalRowsAllSites += data.length;
                    continue;
                }

                // Insert data in batches
                const batchSize = 1000;
                let totalInserted = 0;

                console.log(`\n💾 Inserting data in batches of ${batchSize}...`);

                for (let j = 0; j < data.length; j += batchSize) {
                    const batch = data.slice(j, j + batchSize);
                    const rows = batch.map((row: any) => ({
                        projectId,
                        siteUrl,
                        date: row.date,
                        clicks: row.clicks,
                        impressions: row.impressions,
                        ctr: row.ctr.toString(),
                        position: row.position.toString(),
                    }));

                    await db
                        .insert(gscDataAggregated)
                        .values(rows)
                        .onConflictDoUpdate({
                            target: [
                                gscDataAggregated.projectId,
                                gscDataAggregated.siteUrl,
                                gscDataAggregated.date,
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
                    const progress = ((totalInserted / data.length) * 100).toFixed(1);
                    process.stdout.write(`\r  Progress: ${totalInserted}/${data.length} (${progress}%)`);
                }

                console.log(`\n✅ Site ${i + 1} complete: ${totalInserted} rows inserted`);
                totalRowsAllSites += totalInserted;

            } catch (error: any) {
                console.error(`\n❌ Error processing ${siteUrl}:`, error.message);
                console.log(`Continuing with next site...\n`);
            }
        }

        console.log(`\n\n${'='.repeat(60)}`);
        console.log(`✅ BACKFILL COMPLETE!`);
        console.log(`📊 Total rows processed across ${sites.length} site(s): ${totalRowsAllSites}`);
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
📚 GSC Aggregated Data Backfill Script

Usage:
  npm run backfill-gsc-agg -- <projectId> <startDate> <endDate> [--dry-run]

Examples:
  npm run backfill-gsc-agg -- 27 2025-09-24 2025-12-21
  npm run backfill-gsc-agg -- 27 2025-09-24 2025-12-21 --dry-run

Arguments:
  projectId   - Project ID to backfill
  startDate   - Start date (YYYY-MM-DD)
  endDate     - End date (YYYY-MM-DD)
  --dry-run   - Test mode (no database writes)

Note: This script fetches AGGREGATED data (date dimension only)
      to match GSC dashboard totals. Use backfill-gsc for granular data.
        `);
        process.exit(0);
    }

    const projectId = parseInt(args[0]);
    const startDate = args[1];
    const endDate = args[2];
    const dryRun = args.includes('--dry-run');

    if (isNaN(projectId)) {
        console.error('❌ Invalid project ID');
        process.exit(1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
    }

    await backfillAggregatedData(projectId, startDate, endDate, dryRun);
    process.exit(0);
}

main();
