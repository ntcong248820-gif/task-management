import {
  db, alerts, gscDataAggregated, ga4Data,
  eq, and, gte, lte, sql, desc,
} from '@repo/db';
import { RECOMMENDATION_RULES, type RuleContext } from '../config/recommendation-rules';
import { logger } from '../utils/logger';

const log = logger.child('AlertEngine');

const Z_WARNING = -1.5;
const Z_CRITICAL = -2.5;
const MIN_DATA_POINTS = 4;

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function subDaysStr(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

function getDOW(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function computeStats(values: number[]): { mean: number; stddev: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, stddev: Math.sqrt(variance) };
}

function computeZScore(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

async function insertAlert(params: {
  workspaceId: string;
  projectId: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    // Dedup: skip if same project+type alert already exists today
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = await db.select({ id: alerts.id })
      .from(alerts)
      .where(and(
        eq(alerts.projectId, params.projectId),
        eq(alerts.type, params.type as any),
        gte(alerts.createdAt, new Date(todayStr + 'T00:00:00Z')),
      ))
      .limit(1);

    if (existing.length) return;

    await db.insert(alerts).values({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      type: params.type as any,
      severity: params.severity as any,
      title: params.title,
      body: params.body,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    log.error(`insertAlert failed (type=${params.type})`, err);
  }
}

async function detectTrafficAnomalies(workspaceId: string, projectId: string) {
  const now = new Date();
  const yesterdayStr = subDaysStr(now, 1);
  const eightWeeksAgoStr = subDaysStr(now, 57);
  const dow = getDOW(yesterdayStr);

  const rows = await db
    .select({
      date: gscDataAggregated.date,
      clicks: gscDataAggregated.clicks,
      impressions: gscDataAggregated.impressions,
      position: gscDataAggregated.position,
    })
    .from(gscDataAggregated)
    .where(and(
      eq(gscDataAggregated.projectId, projectId),
      gte(gscDataAggregated.date, eightWeeksAgoStr),
      lte(gscDataAggregated.date, yesterdayStr),
    ))
    .orderBy(desc(gscDataAggregated.date));

  const sameDow = rows.filter((r) => getDOW(r.date) === dow);

  if (sameDow.length < MIN_DATA_POINTS) {
    log.info(`Project ${projectId}: ${sameDow.length} same-DoW points < ${MIN_DATA_POINTS}. Skipping.`);
    return null;
  }

  const todayRow = sameDow.find((r) => r.date === yesterdayStr);
  if (!todayRow) return null;

  // Guard: missing GSC data (API outage)
  if (todayRow.impressions === 0) {
    log.info(`Project ${projectId}: impressions=0 for ${yesterdayStr} — likely missing data`);
    return null;
  }

  const history = sameDow.filter((r) => r.date !== yesterdayStr);
  const clickStats = computeStats(history.map((r) => r.clicks));
  const impressionStats = computeStats(history.map((r) => r.impressions));
  const positionStats = computeStats(history.map((r) => parseFloat(String(r.position))));

  const clickZ = computeZScore(todayRow.clicks, clickStats.mean, clickStats.stddev);
  const impressionZ = computeZScore(todayRow.impressions, impressionStats.mean, impressionStats.stddev);
  const positionZ = computeZScore(parseFloat(String(todayRow.position)), positionStats.mean, positionStats.stddev);

  const dowName = DOW_NAMES[dow];

  if (clickZ < Z_CRITICAL) {
    await insertAlert({
      workspaceId, projectId,
      type: 'traffic_drop', severity: 'critical',
      title: 'Critical traffic drop detected',
      body: `Clicks dropped ${Math.abs(clickZ).toFixed(1)} standard deviations below your typical ${dowName} average.`,
      metadata: { zScore: clickZ, metric: 'clicks', date: yesterdayStr, value: todayRow.clicks, mean: clickStats.mean },
    });
  } else if (clickZ < Z_WARNING) {
    await insertAlert({
      workspaceId, projectId,
      type: 'traffic_drop', severity: 'warning',
      title: 'Traffic drop detected',
      body: `Clicks are ${Math.abs(clickZ).toFixed(1)} standard deviations below your typical ${dowName} average.`,
      metadata: { zScore: clickZ, metric: 'clicks', date: yesterdayStr, value: todayRow.clicks, mean: clickStats.mean },
    });
  }

  if (impressionZ < Z_WARNING && clickZ >= Z_WARNING) {
    await insertAlert({
      workspaceId, projectId,
      type: 'anomaly',
      severity: impressionZ < Z_CRITICAL ? 'critical' : 'warning',
      title: 'Impression drop detected',
      body: `Impressions dropped ${Math.abs(impressionZ).toFixed(1)} standard deviations below your ${dowName} average while clicks stayed stable.`,
      metadata: { zScore: impressionZ, metric: 'impressions', date: yesterdayStr, value: todayRow.impressions, mean: impressionStats.mean },
    });
  }

  if (positionStats.stddev > 0 && positionZ > 1.5) {
    await insertAlert({
      workspaceId, projectId,
      type: 'ranking_drop', severity: 'warning',
      title: 'Average ranking position dropped',
      body: `Average position rose ${positionZ.toFixed(1)} standard deviations above your typical ${dowName} average (higher number = worse ranking).`,
      metadata: { zScore: positionZ, metric: 'position', date: yesterdayStr, value: todayRow.position, mean: positionStats.mean },
    });
  }

  return { clickZ, impressionZ };
}

async function detectCrossSourceAnomalies(workspaceId: string, projectId: string) {
  const now = new Date();
  const yesterdayStr = subDaysStr(now, 1);
  const eightWeeksAgoStr = subDaysStr(now, 57);
  const dow = getDOW(yesterdayStr);

  const [gscRows, ga4Rows] = await Promise.all([
    db.select({ date: gscDataAggregated.date, clicks: gscDataAggregated.clicks, impressions: gscDataAggregated.impressions })
      .from(gscDataAggregated)
      .where(and(eq(gscDataAggregated.projectId, projectId), gte(gscDataAggregated.date, eightWeeksAgoStr), lte(gscDataAggregated.date, yesterdayStr)))
      .orderBy(desc(gscDataAggregated.date)),
    db.select({ date: ga4Data.date, sessions: ga4Data.sessions })
      .from(ga4Data)
      .where(and(eq(ga4Data.projectId, projectId), gte(ga4Data.date, eightWeeksAgoStr), lte(ga4Data.date, yesterdayStr), eq(ga4Data.medium, 'organic')))
      .orderBy(desc(ga4Data.date)),
  ]);

  const gscSameDow = gscRows.filter((r) => getDOW(r.date) === dow);
  const ga4SameDow = ga4Rows.filter((r) => getDOW(r.date) === dow);

  if (gscSameDow.length < MIN_DATA_POINTS || ga4SameDow.length < MIN_DATA_POINTS) return;

  const gscToday = gscSameDow.find((r) => r.date === yesterdayStr);
  const ga4Today = ga4SameDow.find((r) => r.date === yesterdayStr);

  if (!gscToday || gscToday.impressions === 0 || !ga4Today) return;

  const gscStats = computeStats(gscSameDow.filter((r) => r.date !== yesterdayStr).map((r) => r.clicks));
  const ga4Stats = computeStats(ga4SameDow.filter((r) => r.date !== yesterdayStr).map((r) => r.sessions));

  if (gscStats.stddev === 0 || ga4Stats.stddev === 0) return;

  const gscZ = computeZScore(gscToday.clicks, gscStats.mean, gscStats.stddev);
  const ga4Z = computeZScore(ga4Today.sessions, ga4Stats.mean, ga4Stats.stddev);

  if (gscZ < Z_WARNING && ga4Z < Z_WARNING) {
    await insertAlert({
      workspaceId, projectId,
      type: 'correlated_drop', severity: 'critical',
      title: 'Correlated drop across GSC & GA4',
      body: 'Both GSC clicks and GA4 organic sessions dropped below normal — strongly suggests an algorithmic or ranking change, not a tracking issue.',
      metadata: { gscZ, ga4Z, date: yesterdayStr, gscClicks: gscToday.clicks, ga4Sessions: ga4Today.sessions },
    });
    return;
  }

  if (gscZ < Z_WARNING && ga4Z > -0.5) {
    await insertAlert({
      workspaceId, projectId,
      type: 'source_discrepancy', severity: 'warning',
      title: 'GSC clicks dropped but GA4 sessions stable',
      body: 'GSC reports fewer clicks while GA4 organic sessions remain normal. Possible cause: GSC filter drift, consent issues, or channel mix shift.',
      metadata: { gscZ, ga4Z, date: yesterdayStr, gscClicks: gscToday.clicks, ga4Sessions: ga4Today.sessions },
    });
  }
}

async function detectContentDecay(workspaceId: string, projectId: string) {
  const decayingPages = await db.execute(sql`
    SELECT
      page,
      SUM(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN impressions ELSE 0 END) AS current_impressions,
      SUM(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN impressions ELSE 0 END) AS prev_impressions
    FROM gsc_data
    WHERE project_id = ${projectId}
      AND date >= NOW() - INTERVAL '14 days'
    GROUP BY page
    HAVING
      (SUM(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN impressions ELSE 0 END)
        < SUM(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN impressions ELSE 0 END) * 0.7
       AND SUM(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN impressions ELSE 0 END) > 0)
      OR (
        AVG(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN CAST(position AS DECIMAL) ELSE NULL END)
        - AVG(CASE WHEN date < NOW() - INTERVAL '7 days' AND date >= NOW() - INTERVAL '14 days' THEN CAST(position AS DECIMAL) ELSE NULL END) > 5
      )
    LIMIT 50
  `);

  const pages = decayingPages as unknown as Array<{ page: string; current_impressions: string; prev_impressions: string }>;
  if (!pages.length) return;

  const topPages = pages.slice(0, 5).map((p) => {
    try { return new URL(p.page.startsWith('http') ? p.page : `https://${p.page}`).pathname; }
    catch { return p.page; }
  });

  await insertAlert({
    workspaceId, projectId,
    type: 'content_decay', severity: 'warning',
    title: `${pages.length} page${pages.length > 1 ? 's' : ''} losing impressions`,
    body: `${pages.length} pages dropped 30%+ impressions week-over-week. Top affected: ${topPages.join(', ')}`,
    metadata: { pageCount: pages.length, topPages },
  });
}

async function generateRecommendations(workspaceId: string, projectId: string) {
  const now = new Date();
  const thirtyDaysAgoStr = subDaysStr(now, 30);
  const sixtyDaysAgoStr = subDaysStr(now, 60);
  const fifteenDaysAgoStr = subDaysStr(now, 15);

  const [currentAgg] = await db.select({
    avgCTR: sql<number>`AVG(CAST(ctr AS DECIMAL))`,
    avgPosition: sql<number>`AVG(CAST(position AS DECIMAL))`,
    totalClicks: sql<number>`SUM(clicks)`,
    totalImpressions: sql<number>`SUM(impressions)`,
  }).from(gscDataAggregated).where(and(
    eq(gscDataAggregated.projectId, projectId),
    gte(gscDataAggregated.date, thirtyDaysAgoStr),
  ));

  const [prevAgg] = await db.select({
    totalClicks: sql<number>`SUM(clicks)`,
    totalImpressions: sql<number>`SUM(impressions)`,
  }).from(gscDataAggregated).where(and(
    eq(gscDataAggregated.projectId, projectId),
    gte(gscDataAggregated.date, sixtyDaysAgoStr),
    lte(gscDataAggregated.date, thirtyDaysAgoStr),
  ));

  if (!currentAgg || !prevAgg) return;

  const prevClicks = Number(prevAgg.totalClicks) || 1;
  const prevImpressions = Number(prevAgg.totalImpressions) || 1;

  const decayResult = await db.execute(sql`
    SELECT COUNT(DISTINCT page) AS cnt
    FROM gsc_data
    WHERE project_id = ${projectId}
      AND date >= NOW() - INTERVAL '14 days'
    GROUP BY page
    HAVING
      SUM(CASE WHEN date >= ${fifteenDaysAgoStr} THEN impressions ELSE 0 END) <
      SUM(CASE WHEN date < ${fifteenDaysAgoStr} THEN impressions ELSE 0 END) * 0.7
      AND SUM(CASE WHEN date < ${fifteenDaysAgoStr} THEN impressions ELSE 0 END) > 0
  `);

  const ctx: RuleContext = {
    projectId,
    avgCTR: Number(currentAgg.avgCTR) || 0,
    avgPosition: Number(currentAgg.avgPosition) || 0,
    impressionsTrend: (Number(currentAgg.totalImpressions) - prevImpressions) / prevImpressions,
    clicksTrend: (Number(currentAgg.totalClicks) - prevClicks) / prevClicks,
    topPageDecayCount: (decayResult as any[]).length,
  };

  for (const rule of RECOMMENDATION_RULES) {
    if (rule.condition(ctx)) {
      await insertAlert({
        workspaceId, projectId,
        type: 'recommendation',
        severity: rule.recommendation.priority === 'high' ? 'warning' : 'info',
        title: rule.recommendation.title,
        body: rule.recommendation.body,
        metadata: { ruleType: rule.recommendation.type, priority: rule.recommendation.priority },
      });
    }
  }
}

export async function runAlertEngine(workspaceId: string, projectId: string): Promise<void> {
  const yesterdayStr = subDaysStr(new Date(), 1);

  const hasData = await db.select({ id: gscDataAggregated.id })
    .from(gscDataAggregated)
    .where(and(eq(gscDataAggregated.projectId, projectId), eq(gscDataAggregated.date, yesterdayStr)))
    .limit(1);

  if (!hasData.length) {
    log.info(`Project ${projectId}: no GSC data for ${yesterdayStr} — skipping`);
    return;
  }

  log.info(`Alert engine running for project ${projectId}...`);

  await Promise.allSettled([
    detectTrafficAnomalies(workspaceId, projectId).catch((e) => log.error(`detectTrafficAnomalies: ${projectId}`, e)),
    detectCrossSourceAnomalies(workspaceId, projectId).catch((e) => log.error(`detectCrossSourceAnomalies: ${projectId}`, e)),
    detectContentDecay(workspaceId, projectId).catch((e) => log.error(`detectContentDecay: ${projectId}`, e)),
    generateRecommendations(workspaceId, projectId).catch((e) => log.error(`generateRecommendations: ${projectId}`, e)),
  ]);

  log.info(`Alert engine done for project ${projectId}`);
}
