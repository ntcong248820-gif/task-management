import { Hono } from 'hono';
import { db, gscData, eq, and, gte, lte, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Rankings');
const app = new Hono();

/**
 * GET /api/rankings/overview
 * Get top movers (biggest position changes) and summary metrics
 */
app.get('/overview', async (c) => {
    try {
        const { projectId, days, startDate, endDate } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        let start: string;
        let end: string;

        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            const numDays = parseInt(days || '30');
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - numDays);
            start = dStart.toISOString().split('T')[0];
            end = dEnd.toISOString().split('T')[0];
        }

        // Calculate previous period
        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);

        // Get current period keyword performance
        const currentPeriod = await db
            .select({
                query: gscData.query,
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                totalImpressions: sql<number>`SUM(${gscData.impressions})`.as('total_impressions'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end)
                )
            )
            .groupBy(gscData.query)
            .orderBy(sql`SUM(${gscData.clicks}) DESC`)
            .limit(100);

        // Get previous period for comparison
        const prevPeriod = await db
            .select({
                query: gscData.query,
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, prevStart.toISOString().split('T')[0]),
                    lte(gscData.date, prevEnd.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.query);

        // Create lookup map for previous period
        const prevMap = new Map(prevPeriod.map(p => [p.query, Number(p.avgPosition)]));

        // Calculate position changes
        const keywordsWithChanges = currentPeriod.map(kw => {
            const prevPos = prevMap.get(kw.query);
            const currentPos = Number(kw.avgPosition);
            const positionChange = prevPos ? prevPos - currentPos : 0; // Positive = improved
            return {
                query: kw.query,
                position: Math.round(currentPos * 10) / 10,
                previousPosition: prevPos ? Math.round(prevPos * 10) / 10 : null,
                positionChange: Math.round(positionChange * 10) / 10,
                clicks: Number(kw.totalClicks),
                impressions: Number(kw.totalImpressions),
            };
        });

        // Sort by position change to get top movers
        const gainers = [...keywordsWithChanges]
            .filter(k => k.positionChange > 0)
            .sort((a, b) => b.positionChange - a.positionChange)
            .slice(0, 5);

        const losers = [...keywordsWithChanges]
            .filter(k => k.positionChange < 0)
            .sort((a, b) => a.positionChange - b.positionChange)
            .slice(0, 5);

        // Calculate summary metrics
        const totalKeywords = keywordsWithChanges.length;
        const improved = keywordsWithChanges.filter(k => k.positionChange > 0).length;
        const declined = keywordsWithChanges.filter(k => k.positionChange < 0).length;
        const avgPosition = totalKeywords > 0
            ? keywordsWithChanges.reduce((sum, k) => sum + k.position, 0) / totalKeywords
            : 0;

        return c.json({
            success: true,
            data: {
                topMovers: { gainers, losers },
                summary: {
                    totalKeywords,
                    improved,
                    declined,
                    unchanged: totalKeywords - improved - declined,
                    avgPosition: Math.round(avgPosition * 10) / 10,
                },
                dateRange: {
                    start,
                    end,
                },
            },
        });
    } catch (error: any) {
        log.error('Rankings overview error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/rankings/keywords
 * Get all keywords with search, sort, and pagination
 */
app.get('/keywords', async (c) => {
    try {
        const {
            projectId,
            search = '',
            sortBy = 'clicks',
            sortOrder = 'desc',
            page = '1',
            limit = '20',
            days,
            startDate,
            endDate
        } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        let start: string;
        let end: string;

        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            const numDays = parseInt(days || '30');
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - numDays);
            start = dStart.toISOString().split('T')[0];
            end = dEnd.toISOString().split('T')[0];
        }

        // Build query with optional search
        let baseQuery = db
            .select({
                query: gscData.query,
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                totalImpressions: sql<number>`SUM(${gscData.impressions})`.as('total_impressions'),
                avgCtr: sql<number>`AVG(${gscData.ctr})`.as('avg_ctr'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end),
                    search ? sql`${gscData.query} ILIKE ${'%' + search + '%'}` : undefined
                )
            )
            .groupBy(gscData.query);

        // Get total count for pagination
        const countResult = await db
            .select({ count: sql<number>`COUNT(DISTINCT ${gscData.query})` })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end),
                    search ? sql`${gscData.query} ILIKE ${'%' + search + '%'}` : undefined
                )
            );

        // Apply sorting
        const orderDir = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;
        let orderedQuery;
        switch (sortBy) {
            case 'position':
                orderedQuery = baseQuery.orderBy(sql`avg_position ${orderDir}`);
                break;
            case 'impressions':
                orderedQuery = baseQuery.orderBy(sql`total_impressions ${orderDir}`);
                break;
            case 'ctr':
                orderedQuery = baseQuery.orderBy(sql`avg_ctr ${orderDir}`);
                break;
            default:
                orderedQuery = baseQuery.orderBy(sql`total_clicks ${orderDir}`);
        }

        const keywords = await orderedQuery.limit(limitNum).offset(offset);

        const formattedKeywords = keywords.map(kw => ({
            query: kw.query,
            position: Math.round(Number(kw.avgPosition) * 10) / 10,
            clicks: Number(kw.totalClicks),
            impressions: Number(kw.totalImpressions),
            ctr: Math.round(Number(kw.avgCtr) * 10000) / 100, // Convert to percentage
        }));

        const totalCount = Number(countResult[0]?.count) || 0;

        return c.json({
            success: true,
            data: {
                keywords: formattedKeywords,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum),
                },
            },
        });
    } catch (error: any) {
        log.error('Rankings keywords error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/rankings/chart
 * Get daily position trend for top keywords
 */
app.get('/chart', async (c) => {
    try {
        const { projectId, days, limit = '5', startDate, endDate } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        const keywordLimit = parseInt(limit);
        let start: string;
        let end: string;

        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            const numDays = parseInt(days || '30');
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - numDays);
            start = dStart.toISOString().split('T')[0];
            end = dEnd.toISOString().split('T')[0];
        }

        // Get top keywords by clicks
        const topKeywords = await db
            .select({
                query: gscData.query,
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end)
                )
            )
            .groupBy(gscData.query)
            .orderBy(sql`SUM(${gscData.clicks}) DESC`)
            .limit(keywordLimit);

        const keywordList = topKeywords.map(k => k.query);

        if (keywordList.length === 0) {
            return c.json({
                success: true,
                data: { chartData: [], keywords: [] },
            });
        }

        // Get daily data for these keywords
        const dailyData = await db
            .select({
                date: gscData.date,
                query: gscData.query,
                position: sql<number>`AVG(${gscData.position})`.as('position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end),
                    sql`${gscData.query} IN (${sql.join(keywordList.map(k => sql`${k}`), sql`, `)})`
                )
            )
            .groupBy(gscData.date, gscData.query)
            .orderBy(gscData.date);

        // Pivot data: date -> { keyword1: pos, keyword2: pos, ... }
        const dateMap = new Map<string, Record<string, number>>();
        dailyData.forEach(d => {
            const dateStr = String(d.date);
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {});
            }
            dateMap.get(dateStr)![d.query] = Math.round(Number(d.position) * 10) / 10;
        });

        const chartData = Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, positions]) => ({
                date,
                displayDate: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }),
                ...positions,
            }));

        return c.json({
            success: true,
            data: {
                chartData,
                keywords: keywordList,
            },
        });
    } catch (error: any) {
        log.error('Rankings chart error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/rankings/distribution
 * Get position distribution buckets
 */
app.get('/distribution', async (c) => {
    try {
        const { projectId, days, startDate, endDate } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        let start: string;
        let end: string;

        if (startDate && endDate) {
            start = startDate;
            end = endDate;
        } else {
            const numDays = parseInt(days || '30');
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - numDays);
            start = dStart.toISOString().split('T')[0];
            end = dEnd.toISOString().split('T')[0];
        }

        // Get keywords with their average positions
        const keywords = await db
            .select({
                query: gscData.query,
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end)
                )
            )
            .groupBy(gscData.query);

        // Calculate distribution buckets
        const buckets = {
            'Top 3 (1-3)': 0,
            'Page 1 (4-10)': 0,
            'Page 2 (11-20)': 0,
            'Page 3-5 (21-50)': 0,
            'Beyond (51+)': 0,
        };

        keywords.forEach(kw => {
            const pos = Number(kw.avgPosition);
            if (pos <= 3) buckets['Top 3 (1-3)']++;
            else if (pos <= 10) buckets['Page 1 (4-10)']++;
            else if (pos <= 20) buckets['Page 2 (11-20)']++;
            else if (pos <= 50) buckets['Page 3-5 (21-50)']++;
            else buckets['Beyond (51+)']++;
        });

        const distribution = Object.entries(buckets).map(([name, count]) => ({
            name,
            count,
            percentage: keywords.length > 0
                ? Math.round((count / keywords.length) * 1000) / 10
                : 0,
        }));

        return c.json({
            success: true,
            data: {
                distribution,
                totalKeywords: keywords.length,
            },
        });
    } catch (error: any) {
        log.error('Rankings distribution error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
