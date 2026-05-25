'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';

export interface CorrelationChartPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
}

export interface TaskAnnotation {
  id: string;
  title: string;
  taskType: string | null;
  completedAt: string | null;
}

export interface CorrelationData {
  chartData: CorrelationChartPoint[];
  tasks: TaskAnnotation[];
  dateRange: { start: string; end: string };
}

export interface ImpactWindowData {
  rangeClicks: number;
  rangeImpressions: number;
  rangeAvgPosition: number;
  priorPeriodClicks: number;
  priorPeriodImpressions: number;
  deltaClicks: number;
  deltaImpressions: number;
  periodLabel: string;
  priorPeriodLabel: string;
  tasks: { id: string; title: string; taskType: string | null; completedAt: string | null }[];
}

export function useCorrelationData(projectId: string | null, days = 90, url?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (url) params.set('url', encodeURIComponent(url));

  const key = projectId
    ? getApiUrl(`/api/correlation?projectId=${projectId}&${params}`)
    : null;
  const { data, error, isLoading, mutate } = useSWR<CorrelationData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}

export function useCorrelationUrls(projectId: string | null) {
  const key = projectId
    ? getApiUrl(`/api/correlation/urls?projectId=${projectId}`)
    : null;
  const { data, error, isLoading } = useSWR<{ urls: string[] }>(key, fetcher);

  return { urls: data?.urls ?? [], loading: isLoading, error: error?.message ?? null };
}

export function useImpactWindow(
  projectId: string | null,
  from: string | null,
  to: string | null,
  url?: string,
) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (url) params.set('url', encodeURIComponent(url));

  const key =
    projectId && from && to
      ? getApiUrl(`/api/correlation/impact-window?projectId=${projectId}&${params}`)
      : null;
  const { data, error, isLoading, mutate } = useSWR<ImpactWindowData>(key, fetcher);

  return { data: data ?? null, loading: isLoading, error: error?.message ?? null, mutate };
}
