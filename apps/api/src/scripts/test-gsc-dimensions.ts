import { db, oauthTokens, gscData, eq, and, gte, lte, sql } from '@repo/db';
import { google } from 'googleapis';
import { getValidAccessToken } from '../utils/token-refresh';

/**
 * Test script to compare different dimension strategies
 */
async function testDimensions() {
    const projectId = 27;
    const startDate = '2025-09-24';
    const endDate = '2025-10-21';

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
        console.error('No GSC token found');
        return;
    }

    const validAccessToken = await getValidAccessToken(tokenRecord);

    // Initialize GSC client
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.GOOGLE_REDIRECT_URI!
    );
    oauth2Client.setCredentials({
        access_token: validAccessToken,
        refresh_token: tokenRecord.refreshToken,
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const siteUrl = 'https://www.dienmayxanh.com/';

    console.log('\n=== Testing Different Dimension Strategies ===\n');

    // Test 1: Only DATE dimension (like GSC dashboard)
    console.log('📊 Test 1: DATE dimension only');
    const dateOnly = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions: ['date'],
            rowLimit: 1000,
        },
    });

    const dateOnlyData = dateOnly.data.rows || [];
    const dateOnlyClicks = dateOnlyData.reduce((sum: number, row: any) => sum + row.clicks, 0);
    const dateOnlyImpressions = dateOnlyData.reduce((sum: number, row: any) => sum + row.impressions, 0);
    const dateOnlyCTR = dateOnlyData.reduce((sum: number, row: any) => sum + row.ctr, 0) / dateOnlyData.length;
    const dateOnlyPosition = dateOnlyData.reduce((sum: number, row: any) => sum + row.position, 0) / dateOnlyData.length;

    console.log(`  Rows: ${dateOnlyData.length}`);
    console.log(`  Clicks: ${dateOnlyClicks.toLocaleString()}`);
    console.log(`  Impressions: ${dateOnlyImpressions.toLocaleString()}`);
    console.log(`  CTR: ${(dateOnlyCTR * 100).toFixed(2)}%`);
    console.log(`  Avg Position: ${dateOnlyPosition.toFixed(2)}`);

    // Test 2: Multiple dimensions (current approach)
    console.log('\n📊 Test 2: Multiple dimensions [date, page, query, country, device]');
    const multiDim = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate,
            endDate,
            dimensions: ['date', 'page', 'query', 'country', 'device'],
            rowLimit: 25000,
        },
    });

    const multiDimData = multiDim.data.rows || [];
    const multiDimClicks = multiDimData.reduce((sum: number, row: any) => sum + row.clicks, 0);
    const multiDimImpressions = multiDimData.reduce((sum: number, row: any) => sum + row.impressions, 0);
    const multiDimCTR = multiDimData.reduce((sum: number, row: any) => sum + row.ctr, 0) / multiDimData.length;
    const multiDimPosition = multiDimData.reduce((sum: number, row: any) => sum + row.position, 0) / multiDimData.length;

    console.log(`  Rows: ${multiDimData.length}`);
    console.log(`  Clicks: ${multiDimClicks.toLocaleString()}`);
    console.log(`  Impressions: ${multiDimImpressions.toLocaleString()}`);
    console.log(`  CTR: ${(multiDimCTR * 100).toFixed(2)}%`);
    console.log(`  Avg Position: ${multiDimPosition.toFixed(2)}`);

    // Test 3: Check database aggregation
    console.log('\n📊 Test 3: Database aggregation (current data)');
    const dbStats = await db
        .select({
            totalClicks: sql<number>`SUM(clicks)`,
            totalImpressions: sql<number>`SUM(impressions)`,
            avgCTR: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
            avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
        })
        .from(gscData)
        .where(
            and(
                eq(gscData.projectId, projectId),
                gte(gscData.date, startDate),
                lte(gscData.date, endDate)
            )
        );

    const dbResult = dbStats[0];
    console.log(`  Clicks: ${Number(dbResult.totalClicks).toLocaleString()}`);
    console.log(`  Impressions: ${Number(dbResult.totalImpressions).toLocaleString()}`);
    console.log(`  CTR: ${(Number(dbResult.avgCTR) * 100).toFixed(2)}%`);
    console.log(`  Avg Position: ${Number(dbResult.avgPosition).toFixed(2)}`);

    console.log('\n=== Comparison ===\n');
    console.log('| Metric | DATE Only | Multi-Dim | Database | Match? |');
    console.log('|--------|-----------|-----------|----------|--------|');
    console.log(`| Clicks | ${dateOnlyClicks.toLocaleString()} | ${multiDimClicks.toLocaleString()} | ${Number(dbResult.totalClicks).toLocaleString()} | ${dateOnlyClicks === Number(dbResult.totalClicks) ? '✅' : '❌'} |`);
    console.log(`| Impressions | ${dateOnlyImpressions.toLocaleString()} | ${multiDimImpressions.toLocaleString()} | ${Number(dbResult.totalImpressions).toLocaleString()} | ${dateOnlyImpressions === Number(dbResult.totalImpressions) ? '✅' : '❌'} |`);

    process.exit(0);
}

testDimensions();
