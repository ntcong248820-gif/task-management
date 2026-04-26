import { Hono } from 'hono';
import { db, gscData, eq, and, gte, lte, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Keywords');
const app = new Hono();

/**
 * GET /api/keywords/detail
 * Get detailed performance data for a specific keyword
 */
app.get('/detail', async (c) => {
    try {
        const { projectId, keyword, days = '30' } = c.req.query();

        if (!projectId || !keyword) {
            return c.json({ success: false, error: 'projectId and keyword are required' }, 400);
        }

        const numDays = parseInt(days);
        const decodedKeyword = decodeURIComponent(keyword);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);

        // Get daily position history
        const positionHistory = await db
            .select({
                date: gscData.date,
                position: sql<number>`AVG(${gscData.position})`.as('position'),
                clicks: sql<number>`SUM(${gscData.clicks})`.as('clicks'),
                impressions: sql<number>`SUM(${gscData.impressions})`.as('impressions'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.query, decodedKeyword),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        // Get summary metrics
        const summaryResult = await db
            .select({
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                totalImpressions: sql<number>`SUM(${gscData.impressions})`.as('total_impressions'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
                avgCtr: sql<number>`AVG(${gscData.ctr})`.as('avg_ctr'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.query, decodedKeyword),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            );

        // Get pages ranking for this keyword
        const pagesRanking = await db
            .select({
                page: gscData.page,
                clicks: sql<number>`SUM(${gscData.clicks})`.as('clicks'),
                impressions: sql<number>`SUM(${gscData.impressions})`.as('impressions'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.query, decodedKeyword),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.page)
            .orderBy(sql`AVG(${gscData.position}) ASC`)
            .limit(10);

        const summary = summaryResult[0];

        // Format chart data
        const chartData = positionHistory.map(d => ({
            date: String(d.date),
            displayDate: new Date(String(d.date)).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }),
            position: Math.round(Number(d.position) * 10) / 10,
            clicks: Number(d.clicks),
            impressions: Number(d.impressions),
        }));

        // Calculate trend (first vs last position)
        let trend = 0;
        if (chartData.length >= 2) {
            const firstPosition = chartData[0].position;
            const lastPosition = chartData[chartData.length - 1].position;
            trend = firstPosition - lastPosition; // Positive = improved, negative = dropped
        }

        return c.json({
            success: true,
            data: {
                keyword: decodedKeyword,
                summary: {
                    totalClicks: Number(summary?.totalClicks || 0),
                    totalImpressions: Number(summary?.totalImpressions || 0),
                    avgPosition: Math.round(Number(summary?.avgPosition || 0) * 10) / 10,
                    avgCtr: Math.round(Number(summary?.avgCtr || 0) * 100) / 100,
                    trend,
                },
                chartData,
                pages: pagesRanking.map(p => ({
                    page: p.page,
                    clicks: Number(p.clicks),
                    impressions: Number(p.impressions),
                    position: Math.round(Number(p.avgPosition) * 10) / 10,
                })),
            },
        });
    } catch (error: any) {
        log.error('Keyword detail error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/keywords/list
 * Get list of all keywords with search/sort/pagination
 */
app.get('/list', async (c) => {
    try {
        const {
            projectId,
            search = '',
            sortBy = 'clicks',
            sortOrder = 'desc',
            page = '1',
            limit = '20',
            days = '30',
        } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        const numDays = parseInt(days);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);

        // Get keywords aggregated
        const keywords = await db
            .select({
                query: gscData.query,
                clicks: sql<number>`SUM(${gscData.clicks})`.as('clicks'),
                impressions: sql<number>`SUM(${gscData.impressions})`.as('impressions'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
                avgCtr: sql<number>`AVG(${gscData.ctr})`.as('avg_ctr'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0]),
                    search ? sql`${gscData.query} ILIKE ${'%' + search + '%'}` : undefined
                )
            )
            .groupBy(gscData.query);

        // Sort
        let sortedKeywords = keywords.map(k => ({
            query: k.query,
            clicks: Number(k.clicks),
            impressions: Number(k.impressions),
            position: Math.round(Number(k.avgPosition) * 10) / 10,
            ctr: Math.round(Number(k.avgCtr) * 100) / 100,
        }));

        sortedKeywords.sort((a, b) => {
            let aVal: number, bVal: number;
            switch (sortBy) {
                case 'position': aVal = a.position; bVal = b.position; break;
                case 'impressions': aVal = a.impressions; bVal = b.impressions; break;
                case 'ctr': aVal = a.ctr; bVal = b.ctr; break;
                default: aVal = a.clicks; bVal = b.clicks;
            }
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        const total = sortedKeywords.length;
        const paginatedKeywords = sortedKeywords.slice(offset, offset + limitNum);

        return c.json({
            success: true,
            data: {
                keywords: paginatedKeywords,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error: any) {
        log.error('Keywords list error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
