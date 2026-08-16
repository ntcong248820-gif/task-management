import { Hono } from 'hono';
import { db, gscData, ga4Data, tasks, eq, and, gte, lte, sql, isNotNull } from '@repo/db';
import { logger } from '../utils/logger';
import { requireProjectInWorkspace } from '../utils/project-access';

const log = logger.child('Correlation');

type AppVariables = { workspaceId: string };
const app = new Hono<{ Variables: AppVariables }>();
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date | null {
    if (!dateOnlyPattern.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0] === value ? parsed : null;
}

/**
 * GET /api/correlation?projectId=X&days=90&url=X (optional)
 * Chart data: daily GSC clicks+impressions, task annotations (affectsWebsite=true only)
 */
app.get('/', async (c) => {
    try {
        const { projectId, days = '90', url } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const numDays = Math.min(Math.max(Number(days) || 90, 7), 365);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - numDays * 86400000);
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const decodedUrl = url ? decodeURIComponent(url) : null;

        // GSC daily data (optionally filtered by URL)
        const gscWhere: any[] = [
            eq(gscData.projectId, projectId),
            isNotNull(gscData.siteUrl),
            gte(gscData.date, start),
            lte(gscData.date, end),
        ];
        if (decodedUrl) gscWhere.push(eq(gscData.page, decodedUrl));

        const gscRaw = await db
            .select({
                date: gscData.date,
                clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)`,
                impressions: sql<number>`COALESCE(SUM(${gscData.impressions}), 0)`,
            })
            .from(gscData)
            .where(and(...gscWhere))
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        // GA4 daily sessions
        const ga4Raw = await db
            .select({
                date: ga4Data.date,
                sessions: sql<number>`COALESCE(SUM(${ga4Data.sessions}), 0)`,
            })
            .from(ga4Data)
            .where(and(eq(ga4Data.projectId, projectId), isNotNull(ga4Data.propertyId), gte(ga4Data.date, start), lte(ga4Data.date, end)))
            .groupBy(ga4Data.date)
            .orderBy(ga4Data.date);

        const ga4Map = new Map(ga4Raw.map(d => [String(d.date), Number(d.sessions)]));

        // Build continuous daily series
        const dateMap = new Map(gscRaw.map(d => [String(d.date), d]));
        const chartData: { date: string; clicks: number; impressions: number; sessions: number }[] = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
            const dateStr = cur.toISOString().split('T')[0];
            const gscDay = dateMap.get(dateStr);
            chartData.push({
                date: dateStr,
                clicks: Number(gscDay?.clicks) || 0,
                impressions: Number(gscDay?.impressions) || 0,
                sessions: ga4Map.get(dateStr) || 0,
            });
            cur.setDate(cur.getDate() + 1);
        }

        // Task annotations — affectsWebsite=true only
        const taskWhere: any[] = [
            eq(tasks.projectId, projectId),
            eq(tasks.status, 'done'),
            eq(tasks.affectsWebsite, true),
            gte(tasks.completedAt, startDate),
            lte(tasks.completedAt, endDate),
        ];
        if (decodedUrl) taskWhere.push(eq(tasks.targetUrl, decodedUrl));

        const annotations = await db
            .select({
                id: tasks.id,
                title: tasks.title,
                taskType: tasks.taskType,
                completedAt: tasks.completedAt,
            })
            .from(tasks)
            .where(and(...taskWhere))
            .orderBy(tasks.completedAt);

        return c.json({
            success: true,
            data: {
                chartData,
                tasks: annotations.map(t => ({
                    id: t.id,
                    title: t.title,
                    taskType: t.taskType,
                    completedAt: t.completedAt?.toISOString().split('T')[0] ?? null,
                })),
                dateRange: { start, end },
            },
        });
    } catch (error: any) {
        log.error('Correlation API error', error);
        return c.json({ success: false, error: 'Failed to fetch correlation data' }, 500);
    }
});

/**
 * GET /api/correlation/urls?projectId=X
 * Unique URLs that have GSC data, for correlation URL filter dropdown
 */
app.get('/urls', async (c) => {
    try {
        const { projectId } = c.req.query();
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400);
        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        // Last 90 days, top 100 by clicks
        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
        const result = await db
            .select({
                page: gscData.page,
                clicks: sql<number>`SUM(${gscData.clicks})`,
            })
            .from(gscData)
            .where(and(eq(gscData.projectId, projectId), isNotNull(gscData.siteUrl), gte(gscData.date, cutoff)))
            .groupBy(gscData.page)
            .orderBy(sql`SUM(${gscData.clicks}) DESC`)
            .limit(100);

        return c.json({
            success: true,
            data: { urls: result.map(r => r.page) },
        });
    } catch (error: any) {
        log.error('Correlation URLs error', error);
        return c.json({ success: false, error: 'Failed to fetch correlation URLs' }, 500);
    }
});

/**
 * GET /api/correlation/impact-window?projectId=X&from=DATE&to=DATE&url=X
 * Compute aggregate metrics for user-selected date range vs equal prior period
 */
app.get('/impact-window', async (c) => {
    try {
        const { projectId, from, to, url } = c.req.query();
        if (!projectId || !from || !to) {
            return c.json({ success: false, error: 'projectId, from, and to are required' }, 400);
        }
        const fromDate = parseDateOnly(from);
        const toDate = parseDateOnly(to);
        if (!fromDate || !toDate) {
            return c.json({ success: false, error: 'from and to must be valid YYYY-MM-DD dates' }, 400);
        }
        if (fromDate > toDate) {
            return c.json({ success: false, error: 'from must be before or equal to to' }, 400);
        }

        const access = await requireProjectInWorkspace(projectId, c.get('workspaceId'));
        if (!access.ok) return c.json({ success: false, error: access.error }, access.status);

        const decodedUrl = url ? decodeURIComponent(url) : null;
        const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

        const priorTo = new Date(fromDate.getTime() - 86400000);
        const priorFrom = new Date(priorTo.getTime() - (rangeDays - 1) * 86400000);

        const priorFromStr = priorFrom.toISOString().split('T')[0];
        const priorToStr = priorTo.toISOString().split('T')[0];

        const buildWhere = (startStr: string, endStr: string) => {
            const conds: any[] = [
                eq(gscData.projectId, projectId),
                isNotNull(gscData.siteUrl),
                gte(gscData.date, startStr),
                lte(gscData.date, endStr),
            ];
            if (decodedUrl) conds.push(eq(gscData.page, decodedUrl));
            return and(...conds);
        };

        const [[rangeMetrics], [priorMetrics]] = await Promise.all([
            db.select({
                clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)`,
                impressions: sql<number>`COALESCE(SUM(${gscData.impressions}), 0)`,
                avgPosition: sql<number>`COALESCE(AVG(${gscData.position}), 0)`,
            }).from(gscData).where(buildWhere(from, to)),
            db.select({
                clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)`,
                impressions: sql<number>`COALESCE(SUM(${gscData.impressions}), 0)`,
                avgPosition: sql<number>`COALESCE(AVG(${gscData.position}), 0)`,
            }).from(gscData).where(buildWhere(priorFromStr, priorToStr)),
        ]);

        const rangeClicks = Number(rangeMetrics?.clicks) || 0;
        const rangeImpressions = Number(rangeMetrics?.impressions) || 0;
        const rangeAvgPosition = Math.round((Number(rangeMetrics?.avgPosition) || 0) * 10) / 10;
        const priorClicks = Number(priorMetrics?.clicks) || 0;
        const priorImpressions = Number(priorMetrics?.impressions) || 0;

        const calcDelta = (curr: number, prev: number) => {
            if (!prev) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 1000) / 10;
        };

        // Also return tasks completed in the selected window
        const taskWhere: any[] = [
            eq(tasks.projectId, projectId),
            eq(tasks.status, 'done'),
            eq(tasks.affectsWebsite, true),
            gte(tasks.completedAt, fromDate),
            lte(tasks.completedAt, toDate),
        ];
        const windowTasks = await db
            .select({ id: tasks.id, title: tasks.title, taskType: tasks.taskType, completedAt: tasks.completedAt })
            .from(tasks)
            .where(and(...taskWhere))
            .orderBy(tasks.completedAt);

        return c.json({
            success: true,
            data: {
                rangeClicks,
                rangeImpressions,
                rangeAvgPosition,
                priorPeriodClicks: priorClicks,
                priorPeriodImpressions: priorImpressions,
                deltaClicks: calcDelta(rangeClicks, priorClicks),
                deltaImpressions: calcDelta(rangeImpressions, priorImpressions),
                periodLabel: `${from} → ${to} (${rangeDays} days)`,
                priorPeriodLabel: `${priorFromStr} → ${priorToStr}`,
                tasks: windowTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    taskType: t.taskType,
                    completedAt: t.completedAt?.toISOString().split('T')[0] ?? null,
                })),
            },
        });
    } catch (error: any) {
        log.error('Correlation impact-window error', error);
        return c.json({ success: false, error: 'Failed to fetch impact window' }, 500);
    }
});

export default app;
