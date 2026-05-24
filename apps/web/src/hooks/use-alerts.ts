'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';
import type { Alert, WorkspaceDigest } from '@repo/types';

export interface AlertFilters {
  projectId?: string | null;
  severity?: string;
  type?: string;
  unreadOnly?: boolean;
}

function buildAlertsKey(filters: AlertFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.type) params.set('type', filters.type);
  if (filters.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return getApiUrl(`/api/alerts${qs ? `?${qs}` : ''}`);
}

export function useAlerts(filters: AlertFilters = {}) {
  const { data, error, isLoading, mutate } = useSWR<Alert[]>(
    buildAlertsKey(filters),
    fetcher,
  );
  return { alerts: data ?? [], loading: isLoading, error, mutate };
}

export function useAlertCount() {
  const { data, error, isLoading, mutate } = useSWR<{ count: number }>(
    getApiUrl('/api/alerts/count'),
    fetcher,
    { refreshInterval: 30_000 }, // poll every 30s
  );
  return { count: data?.count ?? 0, loading: isLoading, error, mutate };
}

export function useLatestDigest() {
  const { data, error, isLoading, mutate } = useSWR<WorkspaceDigest | null>(
    getApiUrl('/api/digest/latest'),
    fetcher,
  );
  return { digest: data ?? null, loading: isLoading, error, mutate };
}

export async function markAlertRead(alertId: string): Promise<void> {
  await fetch(getApiUrl(`/api/alerts/${alertId}/read`), {
    method: 'PATCH',
    credentials: 'include',
  });
}

export async function markAllAlertsRead(): Promise<void> {
  await fetch(getApiUrl('/api/alerts/read-all'), {
    method: 'PATCH',
    credentials: 'include',
  });
}

export async function dismissAlert(alertId: string): Promise<void> {
  await fetch(getApiUrl(`/api/alerts/${alertId}`), {
    method: 'DELETE',
    credentials: 'include',
  });
}
