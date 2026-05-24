import {
  db, workspaceDigests, gscDataAggregated, tasks, alerts, projects,
  eq, and, gte, lte, sql, inArray,
} from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('WeeklyDigest');

function subDaysStr(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

function startOfLastWeekMonday(now: Date): string {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun
  // Days since this week's Monday: Mon=0, Tue=1, …, Sun=6
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday - 7);
  return d.toISOString().split('T')[0];
}

export async function generateWeeklyDigest(workspaceId: string): Promise<void> {
  log.info(`Generating weekly digest for workspace ${workspaceId}...`);

  const now = new Date();
  const weekStart = startOfLastWeekMonday(now);
  const weekStartDate = new Date(weekStart + 'T00:00:00Z');
  const weekEnd = subDaysStr(new Date(weekStart + 'T00:00:00Z'), -6); // +6 days = Sunday
  const prevWeekStart = subDaysStr(weekStartDate, 7);
  const prevWeekEnd = subDaysStr(weekStartDate, 1);

  // Fetch workspace project IDs to scope all GSC queries
  const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
  const projectIds = projectRows.map((r) => r.id);

  if (!projectIds.length) {
    log.info(`No projects found for workspace ${workspaceId}, skipping digest`);
    return;
  }

  // Current + previous week GSC totals (scoped to workspace projects)
  const [[currentGsc], [prevGsc]] = await Promise.all([
    db.select({
      totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
      totalImpressions: sql<number>`COALESCE(SUM(impressions), 0)`,
    }).from(gscDataAggregated).where(and(
      inArray(gscDataAggregated.projectId, projectIds),
      gte(gscDataAggregated.date, weekStart),
      lte(gscDataAggregated.date, weekEnd),
    )),
    db.select({
      totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
      totalImpressions: sql<number>`COALESCE(SUM(impressions), 0)`,
    }).from(gscDataAggregated).where(and(
      inArray(gscDataAggregated.projectId, projectIds),
      gte(gscDataAggregated.date, prevWeekStart),
      lte(gscDataAggregated.date, prevWeekEnd),
    )),
  ]);

  const curClicks = Number(currentGsc?.totalClicks ?? 0);
  const prevClicks = Number(prevGsc?.totalClicks ?? 0);
  const curImpressions = Number(currentGsc?.totalImpressions ?? 0);
  const prevImpressions = Number(prevGsc?.totalImpressions ?? 0);

  const clicksPct = prevClicks > 0 ? Math.round(((curClicks - prevClicks) / prevClicks) * 100) : 0;
  const impressionsPct = prevImpressions > 0 ? Math.round(((curImpressions - prevImpressions) / prevImpressions) * 100) : 0;

  // Tasks completed this week in the workspace
  const [tasksDoneRow] = await db.select({
    cnt: sql<number>`COUNT(*)`,
  }).from(tasks).where(and(
    eq(tasks.workspaceId, workspaceId),
    eq(tasks.status, 'done'),
    gte(tasks.updatedAt, weekStartDate),
    lte(tasks.updatedAt, new Date(weekEnd + 'T23:59:59Z')),
  ));

  // Alerts triggered this week in the workspace
  const [alertCountRow] = await db.select({
    cnt: sql<number>`COUNT(*)`,
  }).from(alerts).where(and(
    eq(alerts.workspaceId, workspaceId),
    gte(alerts.createdAt, weekStartDate),
    lte(alerts.createdAt, new Date(weekEnd + 'T23:59:59Z')),
  ));

  // Top keyword position changes (improvement = delta < 0, decline = delta > 0)
  const projectIdList = projectIds.map((id) => `'${id}'`).join(',');
  const keywordDelta = await db.execute(sql`
    SELECT
      query,
      AVG(CASE WHEN date >= ${weekStart} AND date <= ${weekEnd}
            THEN CAST(position AS DECIMAL) ELSE NULL END) AS cur_pos,
      AVG(CASE WHEN date >= ${prevWeekStart} AND date <= ${prevWeekEnd}
            THEN CAST(position AS DECIMAL) ELSE NULL END) AS prev_pos,
      (AVG(CASE WHEN date >= ${weekStart} AND date <= ${weekEnd}
               THEN CAST(position AS DECIMAL) ELSE NULL END)
       - AVG(CASE WHEN date >= ${prevWeekStart} AND date <= ${prevWeekEnd}
                  THEN CAST(position AS DECIMAL) ELSE NULL END)) AS delta
    FROM gsc_data
    WHERE date >= ${prevWeekStart} AND date <= ${weekEnd}
      AND project_id IN (${sql.raw(projectIdList)})
    GROUP BY query
    HAVING
      AVG(CASE WHEN date >= ${weekStart} AND date <= ${weekEnd}
            THEN CAST(position AS DECIMAL) ELSE NULL END) IS NOT NULL
      AND AVG(CASE WHEN date >= ${prevWeekStart} AND date <= ${prevWeekEnd}
                   THEN CAST(position AS DECIMAL) ELSE NULL END) IS NOT NULL
      AND ABS(
        AVG(CASE WHEN date >= ${weekStart} AND date <= ${weekEnd}
              THEN CAST(position AS DECIMAL) ELSE NULL END)
        - AVG(CASE WHEN date >= ${prevWeekStart} AND date <= ${prevWeekEnd}
                   THEN CAST(position AS DECIMAL) ELSE NULL END)
      ) >= 1
    ORDER BY delta ASC
    LIMIT 10
  `);

  const rows = keywordDelta as unknown as Array<{ query: string; delta: string }>;

  const topImprovements = rows
    .filter((r) => parseFloat(r.delta) < 0)
    .slice(0, 3)
    .map((r) => ({ keyword: r.query, positionDelta: Math.round(parseFloat(r.delta) * 10) / 10 }));

  const topDeclines = rows
    .filter((r) => parseFloat(r.delta) > 0)
    .slice(-3)
    .reverse()
    .map((r) => ({ keyword: r.query, positionDelta: Math.round(parseFloat(r.delta) * 10) / 10 }));

  const data = {
    weeklyClicks: { current: curClicks, previous: prevClicks, pct: clicksPct },
    weeklyImpressions: { current: curImpressions, previous: prevImpressions, pct: impressionsPct },
    alertsTriggered: Number(alertCountRow?.cnt ?? 0),
    tasksCompleted: Number(tasksDoneRow?.cnt ?? 0),
    topImprovements,
    topDeclines,
  };

  await db.insert(workspaceDigests).values({
    workspaceId,
    weekStart,
    data,
  }).onConflictDoUpdate({
    target: [workspaceDigests.workspaceId, workspaceDigests.weekStart],
    set: { data },
  });

  log.info(`Weekly digest stored for workspace ${workspaceId}, week ${weekStart}`);
}
