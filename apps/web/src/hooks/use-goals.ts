'use client';

import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';
import type { Goal, GoalWithDetail, GoalProgress } from '@/types/goal.types';

export interface GoalFilters {
  projectId?: string | null;
  status?: string;
}

function buildGoalKey(filters: GoalFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return getApiUrl(`/api/goals${qs ? `?${qs}` : ''}`);
}

export function useGoals(filters: GoalFilters = {}) {
  const { data, error, isLoading, mutate } = useSWR<Goal[]>(
    buildGoalKey(filters),
    fetcher
  );
  return { goals: data ?? [], loading: isLoading, error, mutate };
}

export function useGoal(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<GoalWithDetail>(
    id ? getApiUrl(`/api/goals/${id}`) : null,
    fetcher
  );
  return { goal: data ?? null, loading: isLoading, error, mutate };
}

export function useGoalProgress(id: string | null) {
  const { data, error, isLoading } = useSWR<GoalProgress>(
    id ? getApiUrl(`/api/goals/${id}/progress`) : null,
    fetcher
  );
  return { progress: data ?? null, loading: isLoading, error };
}

export async function createGoal(body: Record<string, unknown>): Promise<Goal> {
  return apiPost<Goal>('/api/goals', body);
}

export async function updateGoal(id: string, body: Record<string, unknown>): Promise<Goal> {
  const res = await fetch(getApiUrl(`/api/goals/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update goal');
  return json.data;
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/goals/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete goal');
}
