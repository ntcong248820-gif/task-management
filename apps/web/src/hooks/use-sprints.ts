'use client';

import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';
import type { Sprint } from '@/types/goal.types';
import type { Task } from '@/types/task.types';

export interface SprintFilters {
  goalId?: string | null;
  projectId?: string | null;
  status?: string;
}

export function buildSprintKey(filters: SprintFilters): string {
  const params = new URLSearchParams();
  if (filters.goalId) params.set('goalId', filters.goalId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return getApiUrl(`/api/sprints${qs ? `?${qs}` : ''}`);
}

export function useSprints(filters: SprintFilters = {}) {
  const { data, error, isLoading, mutate } = useSWR<Sprint[]>(
    buildSprintKey(filters),
    fetcher
  );
  return { sprints: data ?? [], loading: isLoading, error, mutate };
}

export function useSprintTasks(sprintId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    sprintId ? getApiUrl(`/api/sprints/${sprintId}/tasks`) : null,
    fetcher
  );
  return { tasks: data ?? [], loading: isLoading, error, mutate };
}

export async function createSprint(body: Record<string, unknown>): Promise<Sprint> {
  return apiPost<Sprint>('/api/sprints', body);
}

export async function updateSprint(id: string, body: Record<string, unknown>): Promise<Sprint> {
  const res = await fetch(getApiUrl(`/api/sprints/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update sprint');
  return json.data;
}

export async function deleteSprint(id: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/sprints/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete sprint');
}

export async function startSprint(id: string): Promise<Sprint> {
  const res = await fetch(getApiUrl(`/api/sprints/${id}/start`), {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to start sprint');
  return json.data;
}

export async function completeSprint(id: string): Promise<Sprint> {
  const res = await fetch(getApiUrl(`/api/sprints/${id}/complete`), {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to complete sprint');
  return json.data;
}
