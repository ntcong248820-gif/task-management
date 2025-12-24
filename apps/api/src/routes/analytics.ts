import { Hono } from 'hono';
import { db, gscData, gscSites, ga4Data, eq, sql, and, gte, lte } from '@repo/db';
import { gscDataAggregated } from '@repo/db/src/schema/gsc_data_aggregated';
import { logger } from '../utils/logger';

const log = logger.child('Analytics');

const app = new Hono();

// Helper to fill missing dates with 0
const fillDateGaps = (data: any[], startDate: string, endDate: string, valueKeys: string[]) => {
    const filled: any[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    const dataMap = new Map(data.map(item => [new Date(item.date).toISOString().split('T')[0], item]));

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const existing = dataMap.get(dateStr);

        if (existing) {
            filled.push({
                ...existing,
                date: dateStr, // Ensure string format
            });
        } else {
            const emptyItem: any = { date: dateStr };
            valueKeys.forEach(key => emptyItem[key] = 0);
            filled.push(emptyItem);
        }

        current.setDate(current.getDate() + 1);
    }

    return filled;
};

/**
 * GET /api/analytics
 * Get combined analytics (GSC + GA4) for a project
 */
app.get('/', async (c) => {
    try {
        const { projectId, startDate, endDate, siteUrl } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        // Default to last 30 days if no date range provided
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        })();

        // Build where conditions for GSC query
        const gscWhereConditions = [
            eq(gscDataAggregated.projectId, parseInt(projectId)),
            gte(gscDataAggregated.date, start),
            lte(gscDataAggregated.date, end),
        ];

        // Add site filter if provided
        if (siteUrl) {
            gscWhereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));
        }

        // Fetch GSC data from AGGREGATED table (date-only dimension)
        // This matches GSC dashboard totals exactly
        const gscAggregated = await db
            .select({
                totalClicks: sql<number>`SUM(clicks)`,
                totalImpressions: sql<number>`SUM(impressions)`,
                avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
                avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
            })
            .from(gscDataAggregated)
            .where(and(...gscWhereConditions));

        const gsc = gscAggregated[0] || { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };

        // Fetch GA4 data
        const ga4Metrics = await db
            .select({
                totalSessions: sql<number>`SUM(sessions)`.as('total_sessions'),
                totalUsers: sql<number>`SUM(users)`.as('total_users'),
                totalConversions: sql<number>`SUM(conversions)`.as('total_conversions'),
                totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))`.as('total_revenue'),
            })
            .from(ga4Data)
            .where(
                and(
                    eq(ga4Data.projectId, parseInt(projectId)),
                    gte(ga4Data.date, start),
                    lte(ga4Data.date, end)
                )
            );

        const ga4 = ga4Metrics[0] || { totalSessions: 0, totalUsers: 0, totalConversions: 0, totalRevenue: 0 };

        return c.json({
            success: true,
            data: {
                gsc: {
                    totalClicks: Number(gsc.totalClicks) || 0,
                    totalImpressions: Number(gsc.totalImpressions) || 0,
                    avgCTR: (Number(gsc.avgCtr) || 0) * 100,
                    avgPosition: Number(gsc.avgPosition) || 0,
                },
                ga4: {
                    totalSessions: Number(ga4.totalSessions) || 0,
                    totalUsers: Number(ga4.totalUsers) || 0,
                    totalConversions: Number(ga4.totalConversions) || 0,
                    totalRevenue: Number(ga4.totalRevenue) || 0,
                },
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics combined error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/analytics/gsc
 * Get GSC metrics for a project
 */
app.get('/gsc', async (c) => {
    try {
        const { projectId, startDate, endDate, siteUrl } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        // Default to last 30 days if no date range provided
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        })();

        // Build where conditions
        const whereConditions = [
            eq(gscDataAggregated.projectId, parseInt(projectId)),
            gte(gscDataAggregated.date, start),
            lte(gscDataAggregated.date, end),
        ];

        if (siteUrl) {
            whereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));
        }

        // Get aggregated metrics from aggregated table
        const metricsResult = await db
            .select({
                totalClicks: sql<number>`SUM(clicks)`,
                totalImpressions: sql<number>`SUM(impressions)`,
                avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
                avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
            })
            .from(gscDataAggregated)
            .where(and(...whereConditions));

        const metrics = metricsResult[0] || { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };

        // Get previous period for comparison
        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);

        // Build previous period where conditions
        const prevWhereConditions = [
            eq(gscDataAggregated.projectId, parseInt(projectId)),
            gte(gscDataAggregated.date, prevStart.toISOString().split('T')[0]),
            lte(gscDataAggregated.date, prevEnd.toISOString().split('T')[0]),
        ];

        if (siteUrl) {
            prevWhereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));
        }

        const prevMetricsResult = await db
            .select({
                totalClicks: sql<number>`SUM(clicks)`,
                totalImpressions: sql<number>`SUM(impressions)`,
                avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
                avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
            })
            .from(gscDataAggregated)
            .where(and(...prevWhereConditions));

        const prevMetrics = prevMetricsResult[0] || { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };

        // Get daily data for chart
        const dailyData = await db
            .select({
                date: gscData.date,
                clicks: sql<number>`SUM(clicks)`.as('clicks'),
                impressions: sql<number>`SUM(impressions)`.as('impressions'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    gte(gscData.date, start),
                    lte(gscData.date, end)
                )
            )
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        // Fill missing dates
        const filledDailyData = fillDateGaps(dailyData, start, end, ['clicks', 'impressions']);

        const current = metrics;
        const previous = prevMetrics;

        // Calculate percentage changes
        const calcChange = (curr: number, prev: number) => {
            if (!prev || prev === 0) return 0;
            return ((curr - prev) / prev) * 100;
        };

        return c.json({
            success: true,
            data: {
                metrics: {
                    clicks: {
                        value: Number(current.totalClicks) || 0,
                        change: calcChange(Number(current.totalClicks) || 0, Number(previous.totalClicks) || 0),
                    },
                    impressions: {
                        value: Number(current.totalImpressions) || 0,
                        change: calcChange(Number(current.totalImpressions) || 0, Number(previous.totalImpressions) || 0),
                    },
                    ctr: {
                        value: (Number(current.avgCtr) || 0) * 100,
                        change: calcChange(Number(current.avgCtr) || 0, Number(previous.avgCtr) || 0),
                    },
                    position: {
                        value: Number(current.avgPosition) || 0,
                        change: calcChange(Number(previous.avgPosition) || 0, Number(current.avgPosition) || 0),
                    },
                },
                chartData: filledDailyData.map(d => ({
                    date: d.date,
                    clicks: Number(d.clicks) || 0,
                    impressions: Number(d.impressions) || 0,
                })),
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics GSC error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/analytics/ga4
 * Get GA4 metrics for a project
 */
app.get('/ga4', async (c) => {
    try {
        const { projectId, startDate, endDate } = c.req.query();

        if (!projectId) {
            return c.json({ success: false, error: 'projectId is required' }, 400);
        }

        // Default to last 30 days
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d.toISOString().split('T')[0];
        })();

        // Get aggregated metrics
        const metrics = await db
            .select({
                totalSessions: sql<number>`SUM(sessions)`.as('total_sessions'),
                totalUsers: sql<number>`SUM(users)`.as('total_users'),
                totalConversions: sql<number>`SUM(conversions)`.as('total_conversions'),
                totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))`.as('total_revenue'),
            })
            .from(ga4Data)
            .where(
                and(
                    eq(ga4Data.projectId, parseInt(projectId)),
                    gte(ga4Data.date, start),
                    lte(ga4Data.date, end)
                )
            );

        // Get previous period
        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);

        const prevMetrics = await db
            .select({
                totalSessions: sql<number>`SUM(sessions)`.as('total_sessions'),
                totalUsers: sql<number>`SUM(users)`.as('total_users'),
                totalConversions: sql<number>`SUM(conversions)`.as('total_conversions'),
                totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))`.as('total_revenue'),
            })
            .from(ga4Data)
            .where(
                and(
                    eq(ga4Data.projectId, parseInt(projectId)),
                    gte(ga4Data.date, prevStart.toISOString().split('T')[0]),
                    lte(ga4Data.date, prevEnd.toISOString().split('T')[0])
                )
            );

        // Get daily data for chart
        const dailyData = await db
            .select({
                date: ga4Data.date,
                sessions: sql<number>`SUM(sessions)`.as('sessions'),
                conversions: sql<number>`SUM(conversions)`.as('conversions'),
            })
            .from(ga4Data)
            .where(
                and(
                    eq(ga4Data.projectId, parseInt(projectId)),
                    gte(ga4Data.date, start),
                    lte(ga4Data.date, end)
                )
            )
            .groupBy(ga4Data.date)
            .orderBy(ga4Data.date);

        // Fill missing dates
        const filledDailyData = fillDateGaps(dailyData, start, end, ['sessions', 'conversions']);

        // Get traffic sources
        const trafficSources = await db
            .select({
                source: ga4Data.source,
                medium: ga4Data.medium,
                sessions: sql<number>`SUM(sessions)`.as('sessions'),
                conversions: sql<number>`SUM(conversions)`.as('conversions'),
                revenue: sql<number>`SUM(CAST(revenue AS DECIMAL))`.as('revenue'),
            })
            .from(ga4Data)
            .where(
                and(
                    eq(ga4Data.projectId, parseInt(projectId)),
                    gte(ga4Data.date, start),
                    lte(ga4Data.date, end)
                )
            )
            .groupBy(ga4Data.source, ga4Data.medium)
            .orderBy(sql`SUM(sessions) DESC`)
            .limit(10);

        const current = metrics[0] || { totalSessions: 0, totalUsers: 0, totalConversions: 0, totalRevenue: 0 };
        const previous = prevMetrics[0] || { totalSessions: 0, totalUsers: 0, totalConversions: 0, totalRevenue: 0 };

        const calcChange = (curr: number, prev: number) => {
            if (!prev || prev === 0) return 0;
            return ((curr - prev) / prev) * 100;
        };

        return c.json({
            success: true,
            data: {
                metrics: {
                    sessions: {
                        value: Number(current.totalSessions) || 0,
                        change: calcChange(Number(current.totalSessions) || 0, Number(previous.totalSessions) || 0),
                    },
                    users: {
                        value: Number(current.totalUsers) || 0,
                        change: calcChange(Number(current.totalUsers) || 0, Number(previous.totalUsers) || 0),
                    },
                    conversions: {
                        value: Number(current.totalConversions) || 0,
                        change: calcChange(Number(current.totalConversions) || 0, Number(previous.totalConversions) || 0),
                    },
                    revenue: {
                        value: Number(current.totalRevenue) || 0,
                        change: calcChange(Number(current.totalRevenue) || 0, Number(previous.totalRevenue) || 0),
                    },
                },
                chartData: filledDailyData.map(d => ({
                    date: d.date,
                    sessions: Number(d.sessions) || 0,
                    conversions: Number(d.conversions) || 0,
                })),
                trafficSources: trafficSources.map(s => ({
                    source: s.source,
                    medium: s.medium,
                    sessions: Number(s.sessions) || 0,
                    conversions: Number(s.conversions) || 0,
                    revenue: Number(s.revenue) || 0,
                    convRate: Number(s.sessions) > 0 ? (Number(s.conversions) / Number(s.sessions) * 100) : 0,
                })),
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics GA4 error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /api/analytics/sites/:projectId - List GSC sites for a project
app.get('/sites/:projectId', async (c) => {
    try {
        const projectId = c.req.param('projectId');

        const sites = await db
            .select({
                id: gscSites.id,
                siteUrl: gscSites.siteUrl,
            })
            .from(gscSites)
            .where(eq(gscSites.projectId, parseInt(projectId)))
            .orderBy(gscSites.siteUrl);

        return c.json({
            success: true,
            data: sites,
        });
    } catch (error: any) {
        log.error('List sites error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
