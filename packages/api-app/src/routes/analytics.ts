import { Hono } from 'hono';
import { db, gscData, gscConnections, ga4Data, gscDataAggregated, tasks, eq, sql, and, gte, lte, desc, isNotNull } from '@repo/db';
import { logger } from '../utils/logger';
import { requireProjectInWorkspace } from '../utils/project-access';

const log = logger.child('Analytics');

type AppVariables = { workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();

const fillDateGaps = (data: any[], startDate: string, endDate: string, valueKeys: string[]) => {
    const filled: any[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    const dataMap = new Map(data.map(item => [new Date(item.date).toISOString().split('T')[0], item]));

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const existing = dataMap.get(dateStr);
        if (existing) {
            filled.push({ ...existing, date: dateStr });
        } else {
            const emptyItem: any = { date: dateStr };
            valueKeys.forEach(key => (emptyItem[key] = 0));
            filled.push(emptyItem);
        }
        current.setDate(current.getDate() + 1);
    }
    return filled;
};

const calcChange = (curr: number, prev: number) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
};

const getPeriodDates = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        prevStart: prevStart.toISOString().split('T')[0],
        prevEnd: prevEnd.toISOString().split('T')[0],
    };
};

/**
 * GET /api/analytics/overview?projectId=X&days=30&ga4Source=organic
 * KPI cards, traffic trend chart, top movers, and cross-source insight
 */
app.get('/overview', async (c) => {
    try {
        const { projectId, days = '30', ga4Source } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);

        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const numDays = Math.min(Math.max(Number(days) || 30, 7), 365);
        const { start, end, prevStart, prevEnd } = getPeriodDates(numDays);

        // --- KPIs current period ---
        const [kpiCurrent] = await db
            .select({
                clicks: sql<number>`COALESCE(SUM(clicks), 0)`,
                impressions: sql<number>`COALESCE(SUM(impressions), 0)`,
                avgCtr: sql<number>`COALESCE(AVG(CAST(ctr AS DECIMAL)), 0)`,
                avgPosition: sql<number>`COALESCE(AVG(CAST(position AS DECIMAL)), 0)`,
            })
            .from(gscDataAggregated)
            .where(and(eq(gscDataAggregated.projectId, projectId), gte(gscDataAggregated.date, start), lte(gscDataAggregated.date, end)));

        // --- KPIs previous period ---
        const [kpiPrev] = await db
            .select({
                clicks: sql<number>`COALESCE(SUM(clicks), 0)`,
                impressions: sql<number>`COALESCE(SUM(impressions), 0)`,
                avgCtr: sql<number>`COALESCE(AVG(CAST(ctr AS DECIMAL)), 0)`,
                avgPosition: sql<number>`COALESCE(AVG(CAST(position AS DECIMAL)), 0)`,
            })
            .from(gscDataAggregated)
            .where(and(eq(gscDataAggregated.projectId, projectId), gte(gscDataAggregated.date, prevStart), lte(gscDataAggregated.date, prevEnd)));

        const kpis = {
            clicks: {
                value: Number(kpiCurrent?.clicks) || 0,
                change: calcChange(Number(kpiCurrent?.clicks) || 0, Number(kpiPrev?.clicks) || 0),
            },
            impressions: {
                value: Number(kpiCurrent?.impressions) || 0,
                change: calcChange(Number(kpiCurrent?.impressions) || 0, Number(kpiPrev?.impressions) || 0),
            },
            avgCtr: {
                value: Math.round((Number(kpiCurrent?.avgCtr) || 0) * 10000) / 100,
                change: calcChange(Number(kpiCurrent?.avgCtr) || 0, Number(kpiPrev?.avgCtr) || 0),
            },
            avgPosition: {
                value: Math.round((Number(kpiCurrent?.avgPosition) || 0) * 10) / 10,
                // Position: lower is better, so sign is inverted
                change: calcChange(Number(kpiPrev?.avgPosition) || 0, Number(kpiCurrent?.avgPosition) || 0),
            },
        };

        // --- Traffic trend (GSC clicks + GA4 sessions dual-axis) ---
        const gscDailyRaw = await db
            .select({
                date: gscData.date,
                clicks: sql<number>`SUM(clicks)`,
                impressions: sql<number>`SUM(impressions)`,
            })
            .from(gscData)
            .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), gte(gscData.date, start), lte(gscData.date, end)))
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        const ga4WhereConditions: any[] = [
            eq(ga4Data.projectId, projectId),
            isNotNull(ga4Data.propertyId),
            gte(ga4Data.date, start),
            lte(ga4Data.date, end),
        ];
        if (ga4Source === 'organic') {
            ga4WhereConditions.push(eq(ga4Data.source, 'google'));
            ga4WhereConditions.push(eq(ga4Data.medium, 'organic'));
        } else if (ga4Source && ga4Source !== 'all') {
            ga4WhereConditions.push(sql`${ga4Data.source} ILIKE ${'%' + ga4Source + '%'}`);
        }

        const ga4DailyRaw = await db
            .select({
                date: ga4Data.date,
                sessions: sql<number>`SUM(sessions)`,
            })
            .from(ga4Data)
            .where(and(...ga4WhereConditions))
            .groupBy(ga4Data.date)
            .orderBy(ga4Data.date);

        const gscFilled = fillDateGaps(gscDailyRaw, start, end, ['clicks', 'impressions']);
        const ga4Map = new Map(ga4DailyRaw.map(d => [String(d.date), Number(d.sessions)]));

        const trafficTrend = gscFilled.map(d => ({
            date: d.date,
            clicks: Number(d.clicks) || 0,
            impressions: Number(d.impressions) || 0,
            sessions: ga4Map.get(d.date) || 0,
        }));

        // --- Top movers (keywords with biggest position change) ---
        type MoversRow = {
            query: string;
            cur_pos: string | null;
            prev_pos: string | null;
            cur_clicks: string | null;
            cur_impressions: string | null;
        };
        const moversRaw = await db.execute<MoversRow>(sql`
            SELECT
                query,
                AVG(position) FILTER (WHERE date >= ${start} AND date <= ${end})::text          AS cur_pos,
                AVG(position) FILTER (WHERE date >= ${prevStart} AND date <= ${prevEnd})::text  AS prev_pos,
                SUM(clicks)   FILTER (WHERE date >= ${start} AND date <= ${end})::text          AS cur_clicks,
                SUM(impressions) FILTER (WHERE date >= ${start} AND date <= ${end})::text       AS cur_impressions
            FROM gsc_data
            WHERE project_id = ${projectId}
              AND site_url IS NOT NULL
              AND date >= ${prevStart} AND date <= ${end}
            GROUP BY query
            HAVING SUM(clicks) FILTER (WHERE date >= ${start} AND date <= ${end}) >= 1
            ORDER BY SUM(clicks) FILTER (WHERE date >= ${start} AND date <= ${end}) DESC NULLS LAST
            LIMIT 200
        `);

        const movableKeywords = moversRaw
            .filter(r => r.cur_pos != null && r.prev_pos != null)
            .map(r => ({
                query: r.query,
                position: Math.round(Number(r.cur_pos) * 10) / 10,
                previousPosition: Math.round(Number(r.prev_pos) * 10) / 10,
                positionChange: Math.round((Number(r.prev_pos) - Number(r.cur_pos)) * 10) / 10,
                clicks: Number(r.cur_clicks) || 0,
                impressions: Number(r.cur_impressions) || 0,
            }));

        const topMovers = {
            improving: [...movableKeywords]
                .filter(k => k.positionChange > 0)
                .sort((a, b) => b.positionChange - a.positionChange)
                .slice(0, 5),
            declining: [...movableKeywords]
                .filter(k => k.positionChange < 0)
                .sort((a, b) => a.positionChange - b.positionChange)
                .slice(0, 5),
        };

        // --- Cross-source insight ---
        const [ga4Current] = await db
            .select({ sessions: sql<number>`COALESCE(SUM(sessions), 0)` })
            .from(ga4Data)
            .where(and(...ga4WhereConditions));
        const ga4PrevConditions: any[] = [
            eq(ga4Data.projectId, projectId),
            isNotNull(ga4Data.propertyId),
            gte(ga4Data.date, prevStart),
            lte(ga4Data.date, prevEnd),
        ];
        if (ga4Source === 'organic') {
            ga4PrevConditions.push(eq(ga4Data.source, 'google'));
            ga4PrevConditions.push(eq(ga4Data.medium, 'organic'));
        } else if (ga4Source && ga4Source !== 'all') {
            ga4PrevConditions.push(sql`${ga4Data.source} ILIKE ${'%' + ga4Source + '%'}`);
        }
        const [ga4Prev] = await db
            .select({ sessions: sql<number>`COALESCE(SUM(sessions), 0)` })
            .from(ga4Data)
            .where(and(...ga4PrevConditions));

        const gscGrowth = calcChange(Number(kpiCurrent?.clicks) || 0, Number(kpiPrev?.clicks) || 0);
        const ga4Growth = calcChange(Number(ga4Current?.sessions) || 0, Number(ga4Prev?.sessions) || 0);
        const delta = Math.abs(gscGrowth - ga4Growth);

        const crossSourceInsight = delta >= 15
            ? {
                type: 'source_discrepancy',
                severity: delta > 30 ? 'warning' : 'info',
                message: `GSC ${gscGrowth >= 0 ? '+' : ''}${gscGrowth}% vs GA4 ${ga4Source ?? 'all'} ${ga4Growth >= 0 ? '+' : ''}${ga4Growth}% — ${Math.round(delta)}% gap`,
                tooltip: 'Possible causes: bot traffic, tracking gaps, consent refusals, or channel mix shift.',
                gscGrowth,
                ga4Growth,
            }
            : null;

        return c.json({
            success: true,
            data: {
                kpis,
                trafficTrend,
                topMovers,
                crossSourceInsight,
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics overview error', error);
        return c.json({ success: false, error: 'Failed to fetch analytics overview' }, 500);
    }
});

/**
 * GET /api/analytics/keywords?projectId=X&days=30&sort=clicks&order=desc&page=1&limit=50&search=
 * Paginated keywords with delta position vs previous period
 */
app.get('/keywords', async (c) => {
    try {
        const {
            projectId,
            days = '30',
            sort = 'clicks',
            order = 'desc',
            page = '1',
            limit = '50',
            search = '',
        } = c.req.query();

        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const numDays = Math.min(Math.max(Number(days) || 30, 7), 365);
        const pageNum = Math.max(Number(page) || 1, 1);
        const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const offset = (pageNum - 1) * limitNum;
        const { start, end, prevStart, prevEnd } = getPeriodDates(numDays);

        type KwRow = {
            query: string;
            cur_pos: string | null;
            prev_pos: string | null;
            cur_clicks: string | null;
            cur_impressions: string | null;
            cur_ctr: string | null;
        };

        const searchFilter = search ? sql` AND query ILIKE ${'%' + search + '%'}` : sql``;
        const validSorts: Record<string, string> = {
            clicks: 'cur_clicks',
            impressions: 'cur_impressions',
            position: 'cur_pos',
            ctr: 'cur_ctr',
            change: 'pos_change',
        };
        const sortCol = validSorts[sort] || 'cur_clicks';
        const sortDir = order === 'asc' ? 'ASC' : 'DESC';

        // Total count
        const countResult = await db.execute<{ cnt: string }>(sql`
            SELECT COUNT(DISTINCT query)::text AS cnt
            FROM gsc_data
            WHERE project_id = ${projectId}
              AND site_url IS NOT NULL
              AND date >= ${start} AND date <= ${end}
              ${searchFilter}
        `);
        const total = Number(countResult[0]?.cnt) || 0;

        const rows = await db.execute<KwRow & { pos_change: string | null }>(sql`
            SELECT
                query,
                AVG(position) FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_pos,
                AVG(position) FILTER (WHERE date >= ${prevStart} AND date <= ${prevEnd})::text AS prev_pos,
                SUM(clicks)   FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_clicks,
                SUM(impressions) FILTER (WHERE date >= ${start} AND date <= ${end})::text  AS cur_impressions,
                AVG(ctr)      FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_ctr,
                (
                    AVG(position) FILTER (WHERE date >= ${prevStart} AND date <= ${prevEnd})
                  - AVG(position) FILTER (WHERE date >= ${start} AND date <= ${end})
                )::text AS pos_change
            FROM gsc_data
            WHERE project_id = ${projectId}
              AND site_url IS NOT NULL
              AND date >= ${prevStart} AND date <= ${end}
              ${searchFilter}
            GROUP BY query
            HAVING SUM(clicks) FILTER (WHERE date >= ${start} AND date <= ${end}) IS NOT NULL
            ORDER BY ${sql.raw(sortCol)} ${sql.raw(sortDir)} NULLS LAST
            LIMIT ${limitNum} OFFSET ${offset}
        `);

        const keywords = rows.map(r => {
            const curPos = Number(r.cur_pos) || 0;
            const prevPos = r.prev_pos != null ? Number(r.prev_pos) : null;
            return {
                query: r.query,
                clicks: Number(r.cur_clicks) || 0,
                impressions: Number(r.cur_impressions) || 0,
                ctr: Math.round((Number(r.cur_ctr) || 0) * 10000) / 100,
                position: Math.round(curPos * 10) / 10,
                previousPosition: prevPos != null ? Math.round(prevPos * 10) / 10 : null,
                positionChange: prevPos != null ? Math.round((prevPos - curPos) * 10) / 10 : 0,
            };
        });

        return c.json({
            success: true,
            data: {
                keywords,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error: any) {
        log.error('Analytics keywords error', error);
        return c.json({ success: false, error: 'Failed to fetch keywords' }, 500);
    }
});

/**
 * GET /api/analytics/keywords/:keyword?projectId=X&days=90
 * Keyword detail: 90-day position trend, clicks/impressions, top pages
 */
app.get('/keywords/:keyword', async (c) => {
    try {
        const keyword = decodeURIComponent(c.req.param('keyword'));
        const { projectId, days = '90' } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const numDays = Math.min(Number(days) || 90, 365);
        const end = new Date().toISOString().split('T')[0];
        const start = new Date(Date.now() - numDays * 86400000).toISOString().split('T')[0];

        const [positionHistory, topPages] = await Promise.all([
            db.select({
                date: gscData.date,
                position: sql<number>`AVG(${gscData.position})`,
                clicks: sql<number>`SUM(${gscData.clicks})`,
                impressions: sql<number>`SUM(${gscData.impressions})`,
            })
                .from(gscData)
                .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), eq(gscData.query, keyword), gte(gscData.date, start), lte(gscData.date, end)))
                .groupBy(gscData.date)
                .orderBy(gscData.date),
            db.select({
                page: gscData.page,
                clicks: sql<number>`SUM(${gscData.clicks})`,
                impressions: sql<number>`SUM(${gscData.impressions})`,
                avgPosition: sql<number>`AVG(${gscData.position})`,
            })
                .from(gscData)
                .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), eq(gscData.query, keyword), gte(gscData.date, start), lte(gscData.date, end)))
                .groupBy(gscData.page)
                .orderBy(sql`SUM(${gscData.clicks}) DESC`)
                .limit(10),
        ]);

        // Tasks linked to this keyword (title or tags contain keyword)
        const linkedTasks = await db
            .select({ id: tasks.id, title: tasks.title, status: tasks.status, completedAt: tasks.completedAt, taskType: tasks.taskType })
            .from(tasks)
            .where(and(
                eq(tasks.projectId, projectId),
                sql`(lower(${tasks.title}) LIKE lower(${'%' + keyword + '%'}) OR ${keyword} = ANY(${tasks.tags}))`,
            ))
            .orderBy(desc(tasks.createdAt))
            .limit(10);

        return c.json({
            success: true,
            data: {
                keyword,
                positionHistory: positionHistory.map(d => ({
                    date: String(d.date),
                    position: Math.round(Number(d.position) * 10) / 10,
                    clicks: Number(d.clicks),
                    impressions: Number(d.impressions),
                })),
                topPages: topPages.map(p => ({
                    page: p.page,
                    clicks: Number(p.clicks),
                    impressions: Number(p.impressions),
                    position: Math.round(Number(p.avgPosition) * 10) / 10,
                })),
                linkedTasks: linkedTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    completedAt: t.completedAt?.toISOString() ?? null,
                    taskType: t.taskType,
                })),
            },
        });
    } catch (error: any) {
        log.error('Analytics keyword detail error', error);
        return c.json({ success: false, error: 'Failed to fetch keyword detail' }, 500);
    }
});

/**
 * GET /api/analytics/pages?projectId=X&days=30&sort=clicks&order=desc&page=1&limit=50&search=
 * Paginated pages with decay status
 */
app.get('/pages', async (c) => {
    try {
        const {
            projectId,
            days = '30',
            sort = 'clicks',
            order = 'desc',
            page = '1',
            limit = '50',
            search = '',
        } = c.req.query();

        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const numDays = Math.min(Math.max(Number(days) || 30, 7), 365);
        const pageNum = Math.max(Number(page) || 1, 1);
        const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const offset = (pageNum - 1) * limitNum;
        const { start, end, prevStart, prevEnd } = getPeriodDates(numDays);

        const searchFilter = search ? sql` AND page ILIKE ${'%' + search + '%'}` : sql``;

        const countResult = await db.execute<{ cnt: string }>(sql`
            SELECT COUNT(DISTINCT page)::text AS cnt
            FROM gsc_data
            WHERE project_id = ${projectId}
              AND site_url IS NOT NULL
              AND date >= ${start} AND date <= ${end}
              ${searchFilter}
        `);
        const total = Number(countResult[0]?.cnt) || 0;

        type PageRow = {
            page: string;
            cur_clicks: string | null;
            prev_clicks: string | null;
            cur_impressions: string | null;
            cur_position: string | null;
            cur_ctr: string | null;
        };

        const validSorts: Record<string, string> = {
            clicks: 'cur_clicks',
            impressions: 'cur_impressions',
            position: 'cur_position',
        };
        const sortCol = validSorts[sort] || 'cur_clicks';
        const sortDir = order === 'asc' ? 'ASC' : 'DESC';

        const rows = await db.execute<PageRow>(sql`
            SELECT
                page,
                SUM(clicks)      FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_clicks,
                SUM(clicks)      FILTER (WHERE date >= ${prevStart} AND date <= ${prevEnd})::text AS prev_clicks,
                SUM(impressions) FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_impressions,
                AVG(position)    FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_position,
                AVG(ctr)         FILTER (WHERE date >= ${start} AND date <= ${end})::text     AS cur_ctr
            FROM gsc_data
            WHERE project_id = ${projectId}
              AND site_url IS NOT NULL
              AND date >= ${prevStart} AND date <= ${end}
              ${searchFilter}
            GROUP BY page
            HAVING SUM(clicks) FILTER (WHERE date >= ${start} AND date <= ${end}) IS NOT NULL
            ORDER BY ${sql.raw(sortCol)} ${sql.raw(sortDir)} NULLS LAST
            LIMIT ${limitNum} OFFSET ${offset}
        `);

        const pages = rows.map(r => {
            const curClicks = Number(r.cur_clicks) || 0;
            const prevClicks = Number(r.prev_clicks) || 0;
            const changePercent = prevClicks > 0
                ? Math.round(((curClicks - prevClicks) / prevClicks) * 1000) / 10
                : curClicks > 0 ? 100 : 0;

            let decayStatus: 'stable' | 'declining' | 'decaying';
            if (changePercent <= -40) decayStatus = 'decaying';
            else if (changePercent <= -15) decayStatus = 'declining';
            else decayStatus = 'stable';

            return {
                page: r.page,
                clicks: curClicks,
                impressions: Number(r.cur_impressions) || 0,
                position: Math.round((Number(r.cur_position) || 0) * 10) / 10,
                ctr: Math.round((Number(r.cur_ctr) || 0) * 10000) / 100,
                changePercent,
                decayStatus,
            };
        });

        return c.json({
            success: true,
            data: { pages, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
    } catch (error: any) {
        log.error('Analytics pages error', error);
        return c.json({ success: false, error: 'Failed to fetch pages' }, 500);
    }
});

/**
 * GET /api/analytics/pages/detail?projectId=X&url=X&days=90
 * Page detail: 90-day traffic trend, top keywords, linked tasks
 */
app.get('/pages/detail', async (c) => {
    try {
        const { projectId, url, days = '90' } = c.req.query();
        if (!projectId || !url) return c.json({ success: false, error: 'projectId and url are required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const decodedUrl = decodeURIComponent(url);
        const numDays = Math.min(Number(days) || 90, 365);
        const end = new Date().toISOString().split('T')[0];
        const start = new Date(Date.now() - numDays * 86400000).toISOString().split('T')[0];

        const [trafficHistory, topKeywords] = await Promise.all([
            db.select({
                date: gscData.date,
                clicks: sql<number>`SUM(${gscData.clicks})`,
                impressions: sql<number>`SUM(${gscData.impressions})`,
                position: sql<number>`AVG(${gscData.position})`,
            })
                .from(gscData)
                .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), eq(gscData.page, decodedUrl), gte(gscData.date, start), lte(gscData.date, end)))
                .groupBy(gscData.date)
                .orderBy(gscData.date),
            db.select({
                query: gscData.query,
                clicks: sql<number>`SUM(${gscData.clicks})`,
                impressions: sql<number>`SUM(${gscData.impressions})`,
                avgPosition: sql<number>`AVG(${gscData.position})`,
            })
                .from(gscData)
                .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), eq(gscData.page, decodedUrl), gte(gscData.date, start), lte(gscData.date, end)))
                .groupBy(gscData.query)
                .orderBy(sql`SUM(${gscData.clicks}) DESC`)
                .limit(10),
        ]);

        const linkedTasks = await db
            .select({ id: tasks.id, title: tasks.title, status: tasks.status, completedAt: tasks.completedAt, taskType: tasks.taskType })
            .from(tasks)
            .where(and(eq(tasks.projectId, projectId), eq(tasks.targetUrl, decodedUrl)))
            .orderBy(desc(tasks.createdAt))
            .limit(10);

        return c.json({
            success: true,
            data: {
                url: decodedUrl,
                trafficHistory: trafficHistory.map(d => ({
                    date: String(d.date),
                    clicks: Number(d.clicks),
                    impressions: Number(d.impressions),
                    position: Math.round(Number(d.position) * 10) / 10,
                })),
                topKeywords: topKeywords.map(k => ({
                    query: k.query,
                    clicks: Number(k.clicks),
                    impressions: Number(k.impressions),
                    position: Math.round(Number(k.avgPosition) * 10) / 10,
                })),
                linkedTasks: linkedTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    completedAt: t.completedAt?.toISOString() ?? null,
                    taskType: t.taskType,
                })),
            },
        });
    } catch (error: any) {
        log.error('Analytics page detail error', error);
        return c.json({ success: false, error: 'Failed to fetch page detail' }, 500);
    }
});

/**
 * GET /api/analytics (legacy) - combined GSC + GA4 totals
 */
app.get('/', async (c) => {
    try {
        const { projectId, startDate, endDate, siteUrl } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        const gscWhereConditions: any[] = [
            eq(gscDataAggregated.projectId, projectId),
            gte(gscDataAggregated.date, start),
            lte(gscDataAggregated.date, end),
        ];
        if (siteUrl) gscWhereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));

        const [gsc] = await db
            .select({
                totalClicks: sql<number>`SUM(clicks)`,
                totalImpressions: sql<number>`SUM(impressions)`,
                avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
                avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
            })
            .from(gscDataAggregated)
            .where(and(...gscWhereConditions));

        const [ga4] = await db
            .select({
                totalSessions: sql<number>`SUM(sessions)`,
                totalUsers: sql<number>`SUM(users)`,
                totalConversions: sql<number>`SUM(conversions)`,
                totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))`,
            })
            .from(ga4Data)
            .where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, start), lte(ga4Data.date, end)));

        return c.json({
            success: true,
            data: {
                gsc: {
                    totalClicks: Number(gsc?.totalClicks) || 0,
                    totalImpressions: Number(gsc?.totalImpressions) || 0,
                    avgCTR: (Number(gsc?.avgCtr) || 0) * 100,
                    avgPosition: Number(gsc?.avgPosition) || 0,
                },
                ga4: {
                    totalSessions: Number(ga4?.totalSessions) || 0,
                    totalUsers: Number(ga4?.totalUsers) || 0,
                    totalConversions: Number(ga4?.totalConversions) || 0,
                    totalRevenue: Number(ga4?.totalRevenue) || 0,
                },
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics combined error', error);
        return c.json({ success: false, error: 'Failed to fetch analytics' }, 500);
    }
});

/**
 * GET /api/analytics/gsc (legacy)
 */
app.get('/gsc', async (c) => {
    try {
        const { projectId, startDate, endDate, siteUrl } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        const whereConditions: any[] = [
            eq(gscDataAggregated.projectId, projectId),
            gte(gscDataAggregated.date, start),
            lte(gscDataAggregated.date, end),
        ];
        if (siteUrl) whereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));

        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - daysDiff);

        const prevWhereConditions: any[] = [
            eq(gscDataAggregated.projectId, projectId),
            gte(gscDataAggregated.date, prevStart.toISOString().split('T')[0]),
            lte(gscDataAggregated.date, prevEnd.toISOString().split('T')[0]),
        ];
        if (siteUrl) prevWhereConditions.push(eq(gscDataAggregated.siteUrl, siteUrl));

        const [[current], [previous], dailyData] = await Promise.all([
            db.select({ totalClicks: sql<number>`SUM(clicks)`, totalImpressions: sql<number>`SUM(impressions)`, avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`, avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))` }).from(gscDataAggregated).where(and(...whereConditions)),
            db.select({ totalClicks: sql<number>`SUM(clicks)`, totalImpressions: sql<number>`SUM(impressions)`, avgCtr: sql<number>`AVG(CAST(ctr AS DECIMAL))`, avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))` }).from(gscDataAggregated).where(and(...prevWhereConditions)),
            db.select({ date: gscData.date, clicks: sql<number>`SUM(clicks)`, impressions: sql<number>`SUM(impressions)` }).from(gscData).where(and(eq(gscData.projectId, projectId), gte(gscData.date, start), lte(gscData.date, end))).groupBy(gscData.date).orderBy(gscData.date),
        ]);

        const filledDailyData = fillDateGaps(dailyData, start, end, ['clicks', 'impressions']);

        return c.json({
            success: true,
            data: {
                metrics: {
                    clicks: { value: Number(current?.totalClicks) || 0, change: calcChange(Number(current?.totalClicks) || 0, Number(previous?.totalClicks) || 0) },
                    impressions: { value: Number(current?.totalImpressions) || 0, change: calcChange(Number(current?.totalImpressions) || 0, Number(previous?.totalImpressions) || 0) },
                    ctr: { value: (Number(current?.avgCtr) || 0) * 100, change: calcChange(Number(current?.avgCtr) || 0, Number(previous?.avgCtr) || 0) },
                    position: { value: Number(current?.avgPosition) || 0, change: calcChange(Number(previous?.avgPosition) || 0, Number(current?.avgPosition) || 0) },
                },
                chartData: filledDailyData.map(d => ({ date: d.date, clicks: Number(d.clicks) || 0, impressions: Number(d.impressions) || 0 })),
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics GSC error', error);
        return c.json({ success: false, error: 'Failed to fetch GSC analytics' }, 500);
    }
});

/**
 * GET /api/analytics/ga4 (legacy)
 */
app.get('/ga4', async (c) => {
    try {
        const { projectId, startDate, endDate } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - daysDiff);

        const [[current], [previous], dailyData, trafficSources] = await Promise.all([
            db.select({ totalSessions: sql<number>`SUM(sessions)`, totalUsers: sql<number>`SUM(users)`, totalConversions: sql<number>`SUM(conversions)`, totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))` }).from(ga4Data).where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, start), lte(ga4Data.date, end))),
            db.select({ totalSessions: sql<number>`SUM(sessions)`, totalUsers: sql<number>`SUM(users)`, totalConversions: sql<number>`SUM(conversions)`, totalRevenue: sql<number>`SUM(CAST(revenue AS DECIMAL))` }).from(ga4Data).where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, prevStart.toISOString().split('T')[0]), lte(ga4Data.date, prevEnd.toISOString().split('T')[0]))),
            db.select({ date: ga4Data.date, sessions: sql<number>`SUM(sessions)`, conversions: sql<number>`SUM(conversions)` }).from(ga4Data).where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, start), lte(ga4Data.date, end))).groupBy(ga4Data.date).orderBy(ga4Data.date),
            db.select({ source: ga4Data.source, medium: ga4Data.medium, sessions: sql<number>`SUM(sessions)`, conversions: sql<number>`SUM(conversions)`, revenue: sql<number>`SUM(CAST(revenue AS DECIMAL))` }).from(ga4Data).where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, start), lte(ga4Data.date, end))).groupBy(ga4Data.source, ga4Data.medium).orderBy(sql`SUM(sessions) DESC`).limit(10),
        ]);

        const filledDailyData = fillDateGaps(dailyData, start, end, ['sessions', 'conversions']);

        return c.json({
            success: true,
            data: {
                metrics: {
                    sessions: { value: Number(current?.totalSessions) || 0, change: calcChange(Number(current?.totalSessions) || 0, Number(previous?.totalSessions) || 0) },
                    users: { value: Number(current?.totalUsers) || 0, change: calcChange(Number(current?.totalUsers) || 0, Number(previous?.totalUsers) || 0) },
                    conversions: { value: Number(current?.totalConversions) || 0, change: calcChange(Number(current?.totalConversions) || 0, Number(previous?.totalConversions) || 0) },
                    revenue: { value: Number(current?.totalRevenue) || 0, change: calcChange(Number(current?.totalRevenue) || 0, Number(previous?.totalRevenue) || 0) },
                },
                chartData: filledDailyData.map(d => ({ date: d.date, sessions: Number(d.sessions) || 0, conversions: Number(d.conversions) || 0 })),
                trafficSources: trafficSources.map(s => ({ source: s.source, medium: s.medium, sessions: Number(s.sessions) || 0, conversions: Number(s.conversions) || 0, revenue: Number(s.revenue) || 0, convRate: Number(s.sessions) > 0 ? (Number(s.conversions) / Number(s.sessions) * 100) : 0 })),
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Analytics GA4 error', error);
        return c.json({ success: false, error: 'Failed to fetch GA4 analytics' }, 500);
    }
});

// GET /api/analytics/sites/:projectId (legacy)
app.get('/sites/:projectId', async (c) => {
    try {
        const projectId = c.req.param('projectId');
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const sites = await db
            .select({ id: gscConnections.id, siteUrl: gscConnections.siteUrl })
            .from(gscConnections)
            .where(and(eq(gscConnections.projectId, projectId), eq(gscConnections.workspaceId, c.get('workspaceId'))))
            .orderBy(gscConnections.siteUrl);

        return c.json({ success: true, data: sites });
    } catch (error: any) {
        log.error('List sites error', error);
        return c.json({ success: false, error: 'Failed to list sites' }, 500);
    }
});

export default app;
