import { Hono } from 'hono';
import { db, gscData, tasks, eq, and, gte, lte, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Correlation');

const app = new Hono();

interface CorrelationDataPoint {
    date: string;
    displayDate: string;
    clicks: number;
    impressions: number;
    position: number;
    completedTasks: {
        id: number;
        title: string;
        type: string;
        timeSpent: number;
    }[];
}

// GET /api/correlation?projectId=1&days=30
app.get('/', async (c) => {
    try {
        const projectId = Number(c.req.query('projectId') || 1);
        const days = Number(c.req.query('days') || 30);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Get GSC data for date range
        const gscDataResult = await db
            .select({
                date: gscData.date,
                clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)`,
                impressions: sql<number>`COALESCE(SUM(${gscData.impressions}), 0)`,
                position: sql<number>`COALESCE(AVG(${gscData.position}), 0)`,
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, projectId),
                    gte(gscData.date, startDate.toISOString().split('T')[0]),
                    lte(gscData.date, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(gscData.date)
            .orderBy(gscData.date);

        // Get completed tasks in date range
        const completedTasks = await db
            .select({
                id: tasks.id,
                title: tasks.title,
                taskType: tasks.taskType,
                timeSpent: tasks.timeSpent,
                completedAt: tasks.completedAt,
            })
            .from(tasks)
            .where(
                and(
                    eq(tasks.projectId, projectId),
                    eq(tasks.status, 'done'),
                    gte(tasks.completedAt, startDate),
                    lte(tasks.completedAt, endDate)
                )
            );

        // Create a map of date -> tasks
        const tasksByDate = new Map<string, typeof completedTasks>();
        completedTasks.forEach(task => {
            if (task.completedAt) {
                const dateStr = task.completedAt.toISOString().split('T')[0];
                if (!tasksByDate.has(dateStr)) {
                    tasksByDate.set(dateStr, []);
                }
                tasksByDate.get(dateStr)!.push(task);
            }
        });

        // Generate data points for all days in range
        const correlationData: CorrelationDataPoint[] = [];
        const currentDate = new Date(startDate);

        // Create GSC data map for quick lookup
        const gscDataMap = new Map<string, typeof gscDataResult[0]>();
        gscDataResult.forEach(d => {
            const dateStr = String(d.date);
            gscDataMap.set(dateStr, d);
        });

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const gscDay = gscDataMap.get(dateStr);
            const tasksOnDay = tasksByDate.get(dateStr) || [];

            correlationData.push({
                date: dateStr,
                displayDate: new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' }),
                clicks: Number(gscDay?.clicks) || 0,
                impressions: Number(gscDay?.impressions) || 0,
                position: Number(gscDay?.position) || 0,
                completedTasks: tasksOnDay.map(t => ({
                    id: t.id,
                    title: t.title,
                    type: t.taskType || 'technical',
                    timeSpent: t.timeSpent || 0,
                })),
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate summary metrics
        const totalClicks = correlationData.reduce((sum, d) => sum + d.clicks, 0);
        const totalImpressions = correlationData.reduce((sum, d) => sum + d.impressions, 0);
        const avgPosition = correlationData.reduce((sum, d) => sum + d.position, 0) / correlationData.length || 0;
        const tasksCompleted = completedTasks.length;

        // Calculate change vs previous period
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - days);
        const prevGscData = await db
            .select({
                clicks: sql<number>`COALESCE(SUM(${gscData.clicks}), 0)`,
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, projectId),
                    gte(gscData.date, prevStartDate.toISOString().split('T')[0]),
                    lte(gscData.date, startDate.toISOString().split('T')[0])
                )
            );

        const prevClicks = Number(prevGscData[0]?.clicks) || 1;
        const trafficGrowth = ((totalClicks - prevClicks) / prevClicks * 100);

        return c.json({
            success: true,
            data: {
                chartData: correlationData,
                metrics: {
                    totalClicks,
                    totalImpressions,
                    avgPosition: Math.round(avgPosition * 10) / 10,
                    tasksCompleted,
                    trafficGrowth: Math.round(trafficGrowth * 10) / 10,
                },
                recentImpactTasks: completedTasks.slice(0, 5).map(t => ({
                    id: t.id,
                    title: t.title,
                    type: t.taskType || 'technical',
                    date: t.completedAt?.toISOString().split('T')[0],
                    impact: Math.round(Math.random() * 15 + 5), // Mock impact %
                })),
            },
        });
    } catch (error: any) {
        log.error('Correlation API error', error);
        return c.json({
            success: false,
            error: error.message,
        }, 500);
    }
});

export default app;
