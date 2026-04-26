import { Hono } from 'hono';
import { db, gscData, eq, and, gte, lte, sql } from '@repo/db';
import { logger } from '../utils/logger';

const log = logger.child('Diagnosis');
const app = new Hono();

interface DiagnosisIssue {
    type: 'declining_traffic' | 'position_drop' | 'low_ctr' | 'high_bounce' | 'content_stale';
    severity: 'alert' | 'warning' | 'info';
    message: string;
    recommendation: string;
    metric?: string;
}

/**
 * GET /api/diagnosis/url
 * Analyze URL performance and generate rule-based recommendations
 */
app.get('/url', async (c) => {
    try {
        const { projectId, url, days, startDate, endDate } = c.req.query();

        if (!projectId || !url) {
            return c.json({ success: false, error: 'projectId and url are required' }, 400);
        }

        const decodedUrl = decodeURIComponent(url);
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

        // Calculate previous period for comparison based on date difference
        const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);

        // Get current period metrics
        const currentMetrics = await db
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
                    eq(gscData.page, decodedUrl),
                    gte(gscData.date, start),
                    lte(gscData.date, end)
                )
            );

        // Get previous period metrics
        const prevMetrics = await db
            .select({
                totalClicks: sql<number>`SUM(${gscData.clicks})`.as('total_clicks'),
                avgPosition: sql<number>`AVG(${gscData.position})`.as('avg_position'),
            })
            .from(gscData)
            .where(
                and(
                    eq(gscData.projectId, parseInt(projectId)),
                    eq(gscData.page, decodedUrl),
                    gte(gscData.date, prevStart.toISOString().split('T')[0]),
                    lte(gscData.date, prevEnd.toISOString().split('T')[0])
                )
            );

        const current = currentMetrics[0];
        const prev = prevMetrics[0];

        if (!current || Number(current.totalClicks) === 0) {
            return c.json({
                success: true,
                data: {
                    url: decodedUrl,
                    issues: [],
                    score: 100,
                    message: 'No data available for this URL',
                },
            });
        }

        const issues: DiagnosisIssue[] = [];
        let score = 100;

        const currentClicks = Number(current.totalClicks);
        const prevClicks = Number(prev?.totalClicks || 0);
        const currentPosition = Number(current.avgPosition);
        const prevPosition = Number(prev?.avgPosition || currentPosition);
        const currentCtr = Number(current.avgCtr);
        const currentImpressions = Number(current.totalImpressions);

        // Rule 1: Declining Traffic
        if (prevClicks > 0) {
            const clickChange = ((currentClicks - prevClicks) / prevClicks) * 100;

            if (clickChange <= -40) {
                issues.push({
                    type: 'declining_traffic',
                    severity: 'alert',
                    message: `Traffic giảm nghiêm trọng ${Math.abs(clickChange).toFixed(1)}%`,
                    recommendation: 'Kiểm tra nội dung, cập nhật thông tin mới nhất, và tối ưu lại title/meta description',
                    metric: `${prevClicks} → ${currentClicks} clicks`,
                });
                score -= 30;
            } else if (clickChange <= -25) {
                issues.push({
                    type: 'declining_traffic',
                    severity: 'warning',
                    message: `Traffic giảm ${Math.abs(clickChange).toFixed(1)}%`,
                    recommendation: 'Review content và cải thiện internal linking',
                    metric: `${prevClicks} → ${currentClicks} clicks`,
                });
                score -= 15;
            } else if (clickChange <= -10) {
                issues.push({
                    type: 'declining_traffic',
                    severity: 'info',
                    message: `Traffic giảm nhẹ ${Math.abs(clickChange).toFixed(1)}%`,
                    recommendation: 'Theo dõi thêm trong tuần tới',
                    metric: `${prevClicks} → ${currentClicks} clicks`,
                });
                score -= 5;
            }
        }

        // Rule 2: Position Drop
        const positionChange = currentPosition - prevPosition;
        if (positionChange > 5) {
            issues.push({
                type: 'position_drop',
                severity: 'alert',
                message: `Thứ hạng tụt mạnh +${positionChange.toFixed(1)} vị trí`,
                recommendation: 'Phân tích đối thủ, cập nhật content, và tăng cường backlinks',
                metric: `Position ${prevPosition.toFixed(1)} → ${currentPosition.toFixed(1)}`,
            });
            score -= 25;
        } else if (positionChange > 3) {
            issues.push({
                type: 'position_drop',
                severity: 'warning',
                message: `Thứ hạng giảm +${positionChange.toFixed(1)} vị trí`,
                recommendation: 'Kiểm tra on-page SEO và content quality',
                metric: `Position ${prevPosition.toFixed(1)} → ${currentPosition.toFixed(1)}`,
            });
            score -= 10;
        }

        // Rule 3: Low CTR with high impressions
        if (currentImpressions > 1000 && currentCtr < 2) {
            issues.push({
                type: 'low_ctr',
                severity: 'warning',
                message: `CTR thấp (${currentCtr.toFixed(2)}%) với ${currentImpressions.toLocaleString()} impressions`,
                recommendation: 'Tối ưu title tag và meta description để tăng CTR',
                metric: `CTR ${currentCtr.toFixed(2)}%`,
            });
            score -= 10;
        } else if (currentImpressions > 500 && currentCtr < 1) {
            issues.push({
                type: 'low_ctr',
                severity: 'alert',
                message: `CTR rất thấp (${currentCtr.toFixed(2)}%)`,
                recommendation: 'Viết lại title và description hấp dẫn hơn',
                metric: `CTR ${currentCtr.toFixed(2)}%`,
            });
            score -= 15;
        }

        // Rule 4: High position but low clicks (opportunity)
        if (currentPosition <= 3 && currentClicks < currentImpressions * 0.1) {
            issues.push({
                type: 'low_ctr',
                severity: 'info',
                message: 'Đang rank top 3 nhưng CTR chưa tối ưu',
                recommendation: 'Thêm rich snippets, FAQ schema, hoặc cải thiện snippet',
                metric: `Position ${currentPosition.toFixed(1)}, CTR ${currentCtr.toFixed(2)}%`,
            });
        }

        // Ensure score doesn't go below 0
        score = Math.max(0, score);

        return c.json({
            success: true,
            data: {
                url: decodedUrl,
                issues,
                score,
                metrics: {
                    clicks: currentClicks,
                    impressions: currentImpressions,
                    position: Math.round(currentPosition * 10) / 10,
                    ctr: Math.round(currentCtr * 100) / 100,
                },
                comparison: {
                    clicksChange: prevClicks > 0 ? ((currentClicks - prevClicks) / prevClicks) * 100 : 0,
                    positionChange,
                },
                lastUpdated: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        log.error('Diagnosis error', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default app;
