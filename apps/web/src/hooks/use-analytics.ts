'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface KpiMetric {
  value: number;
  change: number;
}

export interface AnalyticsKpis {
  clicks: KpiMetric;
  impressions: KpiMetric;
  avgCtr: KpiMetric;
  avgPosition: KpiMetric;
}

export interface DailyTrafficPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
}

export interface KeywordMover {
  query: string;
  position: number;
  previousPosition: number;
  positionChange: number;
  clicks: number;
  impressions: number;
}

export interface CrossSourceInsight {
  type: string;
  severity: 'info' | 'warning';
  message: string;
  tooltip: string;
  gscGrowth: number;
  ga4Growth: number;
}

export interface OverviewData {
  kpis: AnalyticsKpis;
  trafficTrend: DailyTrafficPoint[];
  topMovers: { improving: KeywordMover[]; declining: KeywordMover[] };
  crossSourceInsight: CrossSourceInsight | null;
  dateRange: { start: string; end: string };
}

export interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  previousPosition: number | null;
  positionChange: number;
}

export interface KeywordsData {
  keywords: KeywordRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KeywordDetailData {
  keyword: string;
  positionHistory: { date: string; position: number; clicks: number; impressions: number }[];
  topPages: { page: string; clicks: number; impressions: number; position: number }[];
  linkedTasks: { id: string; title: string; status: string; completedAt: string | null; taskType: string | null }[];
}

export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  changePercent: number;
  decayStatus: 'stable' | 'declining' | 'decaying';
}

export interface PagesData {
  pages: PageRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PageDetailData {
  url: string;
  trafficHistory: { date: string; clicks: number; impressions: number; position: number }[];
  topKeywords: { query: string; clicks: number; impressions: number; position: number }[];
  linkedTasks: { id: string; title: string; status: string; completedAt: string | null; taskType: string | null }[];
}

// ─── Overview hook ────────────────────────────────────────────────────────────

export function useAnalyticsOverview(projectId: string | null, days = 30, ga4Source?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (ga4Source) params.set('ga4Source', ga4Source);

  const key = projectId
    ? getApiUrl(`/api/analytics/overview?projectId=${projectId}&${params}`)
    : null;
  const { data, error, isLoading, mutate } = useSWR<OverviewData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}

// ─── Keywords hook ────────────────────────────────────────────────────────────

export interface KeywordsParams {
  days?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

export function useAnalyticsKeywords(projectId: string | null, params: KeywordsParams = {}) {
  const { days = 30, sort = 'clicks', order = 'desc', page = 1, limit = 50, search = '' } = params;
  const qs = new URLSearchParams({
    days: String(days),
    sort,
    order,
    page: String(page),
    limit: String(limit),
    search,
  });

  const key = projectId ? getApiUrl(`/api/analytics/keywords?projectId=${projectId}&${qs}`) : null;
  const { data, error, isLoading, mutate } = useSWR<KeywordsData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}

// ─── Keyword detail hook ───────────────────────────────────────────────────────

export function useKeywordDetail(projectId: string | null, keyword: string | null, days = 90) {
  const encodedKeyword = keyword ? encodeURIComponent(keyword) : null;
  const key =
    projectId && encodedKeyword
      ? getApiUrl(`/api/analytics/keywords/${encodedKeyword}?projectId=${projectId}&days=${days}`)
      : null;
  const { data, error, isLoading, mutate } = useSWR<KeywordDetailData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}

// ─── Pages hook ───────────────────────────────────────────────────────────────

export interface PagesParams {
  days?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

export function useAnalyticsPages(projectId: string | null, params: PagesParams = {}) {
  const { days = 30, sort = 'clicks', order = 'desc', page = 1, limit = 50, search = '' } = params;
  const qs = new URLSearchParams({
    days: String(days),
    sort,
    order,
    page: String(page),
    limit: String(limit),
    search,
  });

  const key = projectId ? getApiUrl(`/api/analytics/pages?projectId=${projectId}&${qs}`) : null;
  const { data, error, isLoading, mutate } = useSWR<PagesData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}

// ─── Page detail hook ─────────────────────────────────────────────────────────

export function usePageDetail(projectId: string | null, url: string | null, days = 90) {
  const key =
    projectId && url
      ? getApiUrl(`/api/analytics/pages/detail?projectId=${projectId}&url=${encodeURIComponent(url)}&days=${days}`)
      : null;
  const { data, error, isLoading, mutate } = useSWR<PageDetailData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}
