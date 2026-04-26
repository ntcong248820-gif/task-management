import { Hono } from 'hono';
import { db, gscData, eq, and, gte, lte, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('URLs');
const app = new Hono();

/**
 * GET /api/urls/overview
 * Get declining URLs with severity and summary metrics
 */
app.get('/overview', async (c) => {
    try {
        const { projectId, days = '30' } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        const numDays = parseInt(days);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);

        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - numDays);

        // Get current period URL performance
        const currentPeriod = await db
            .select({
                page: gscData.page,
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                totalImpressions: sql<number>`SUM(${gscData.impressions})`.as('total_impressions'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.page)
            .orderBy(sql`SUM(${gscData.clicks}) DESC`)
            .limit(200);

        // Get previous period for comparison
        const prevPeriod = await db
            .select({
                page: gscData.page,
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, prevStartDate.toISOString().split('T')[0]),
                    lte(gscData.date, prevEndDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.page);

        // Create lookup map for previous period
        const prevMap = new Map(prevPeriod.map(p => [p.page, Number(p.totalClicks)]));

        // Calculate changes and categorize
        const urlsWithChanges = currentPeriod.map(url => {
            const currentClicks = Number(url.totalClicks);
            const prevClicks = prevMap.get(url.page) || 0;
            const changePercent = prevClicks > 0
                ? ((currentClicks - prevClicks) / prevClicks) * 100
                : currentClicks > 0 ? 100 : 0;

            // Determine severity
            let severity: 'severe' | 'moderate' | 'slight' | 'stable' | 'improving' = 'stable';
            if (changePercent <= -40) severity = 'severe';
            else if (changePercent <= -25) severity = 'moderate';
            else if (changePercent <= -10) severity = 'slight';
            else if (changePercent >= 10) severity = 'improving';

            return {
                page: url.page,
                clicks: currentClicks,
                previousClicks: prevClicks,
                impressions: Number(url.totalImpressions),
                position: Math.round(Number(url.avgPosition) * 10) / 10,
                changePercent: Math.round(changePercent * 10) / 10,
                severity,
            };
        });

        // Get declining URLs sorted by change
        const decliningUrls = urlsWithChanges
            .filter(u => u.severity !== 'stable' && u.severity !== 'improving')
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 10);

        // Calculate summary
        const total = urlsWithChanges.length;
        const declining = urlsWithChanges.filter(u => u.changePercent < -10).length;
        const improving = urlsWithChanges.filter(u => u.changePercent > 10).length;
        const avgChange = total > 0
            ? urlsWithChanges.reduce((sum, u) => sum + u.changePercent, 0) / total
            : 0;

        return c.json({
            success: true,
            data: {
                decliningUrls,
                summary: {
                    totalUrls: total,
                    declining,
                    improving,
                    stable: total - declining - improving,
                    avgChangePercent: Math.round(avgChange * 10) / 10,
                },
            },
        });
    } catch (error: any) {
        log.error('URLs overview error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/urls/list
 * Get all URLs with search, sort, filter, and pagination
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
            filter = 'all' // all, declining, improving
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

        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - numDays);

        // Get current period
        const currentPeriod = await db
            .select({
                page: gscData.page,
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                totalImpressions: sql<number>`SUM(${gscData.impressions})`.as('total_impressions'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
                avgCtr: sql<number>`AVG(${gscData.ctr})`.as('avg_ctr'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0]),
                    search ? sql`${gscData.page} ILIKE ${'%' + search + '%'}` : undefined
                )
            )
            .groupBy(gscData.page);

        // Get previous period
        const prevPeriod = await db
            .select({
                page: gscData.page,
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, prevStartDate.toISOString().split('T')[0]),
                    lte(gscData.date, prevEndDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.page);

        const prevMap = new Map(prevPeriod.map(p => [p.page, Number(p.totalClicks)]));

        // Process and filter
        let urls = currentPeriod.map(url => {
            const currentClicks = Number(url.totalClicks);
            const prevClicks = prevMap.get(url.page) || 0;
            const changePercent = prevClicks > 0
                ? ((currentClicks - prevClicks) / prevClicks) * 100
                : currentClicks > 0 ? 100 : 0;

            return {
                page: url.page,
                clicks: currentClicks,
                previousClicks: prevClicks,
                impressions: Number(url.totalImpressions),
                position: Math.round(Number(url.avgPosition) * 10) / 10,
                ctr: Math.round(Number(url.avgCtr) * 10000) / 100,
                changePercent: Math.round(changePercent * 10) / 10,
            };
        });

        // Apply filter
        if (filter === 'declining') {
            urls = urls.filter(u => u.changePercent < -10);
        } else if (filter === 'improving') {
            urls = urls.filter(u => u.changePercent > 10);
        }

        // Sort
        urls.sort((a, b) => {
            let aVal: number, bVal: number;
            switch (sortBy) {
                case 'position': aVal = a.position; bVal = b.position; break;
                case 'impressions': aVal = a.impressions; bVal = b.impressions; break;
                case 'change': aVal = a.changePercent; bVal = b.changePercent; break;
                default: aVal = a.clicks; bVal = b.clicks;
            }
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        const totalCount = urls.length;
        const paginatedUrls = urls.slice(offset, offset + limitNum);

        return c.json({
            success: true,
            data: {
                urls: paginatedUrls,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum),
                },
            },
        });
    } catch (error: any) {
        log.error('URLs list error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/urls/detail
 * Get daily performance for a specific URL
 */
app.get('/detail', async (c) => {
    try {
        const { projectId, url, days = '30' } = c.req.query();

        if (!projectId || !url) {
            return c.json({ success: false, error: 'projectId and url are required' }, 400);
        }

        const numDays = parseInt(days);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);

        // Get daily data for this URL
        const dailyData = await db
            .select({
                date: gscData.date,
                clicks: sql<number>`SUM(${gscData.clicks})`.as('clicks'),
                impressions: sql<number>`SUM(${gscData.impressions})`.as('impressions'),
                position: sql<number>`AVG(${gscData.position})`.as('position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.page, decodeURIComponent(url)),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        // Get top queries for this URL
        const topQueries = await db
            .select({
                query: gscData.query,
                clicks: sql<number>`SUM(${gscData.clicks})`.as('clicks'),
                impressions: sql<number>`SUM(${gscData.impressions})`.as('impressions'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.page, decodeURIComponent(url)),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.query)
            .orderBy(sql`SUM(${gscData.clicks}) DESC`)
            .limit(10);

        const chartData = dailyData.map(d => ({
            date: String(d.date),
            displayDate: new Date(String(d.date)).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }),
            clicks: Number(d.clicks),
            impressions: Number(d.impressions),
            position: Math.round(Number(d.position) * 10) / 10,
        }));

        return c.json({
            success: true,
            data: {
                url: decodeURIComponent(url),
                chartData,
                topQueries: topQueries.map(q => ({
                    query: q.query,
                    clicks: Number(q.clicks),
                    impressions: Number(q.impressions),
                })),
            },
        });
    } catch (error: any) {
        log.error('URL detail error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
