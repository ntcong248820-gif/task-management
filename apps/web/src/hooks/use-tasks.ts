'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { getApiUrl } from '@/lib/config';
import type { Task, TaskTemplate } from '@/types/task.types';

export interface TaskFilters {
  projectId?: string | null;
  sprintId?: string | null;
  assigneeId?: string | null;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildTaskKey(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.sprintId) params.set('sprintId', filters.sprintId);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return getApiUrl(`/api/tasks${qs ? `?${qs}` : ''}`);
}

export function useTasks(filters: TaskFilters = {}) {
  const key = buildTaskKey(filters);
  const { data, error, isLoading, mutate } = useSWR<Task[]>(key, fetcher);
  return { tasks: data ?? [], loading: isLoading, error, mutate };
}

export function useTask(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Task>(
    id ? getApiUrl(`/api/tasks/${id}`) : null,
    fetcher
  );
  return { task: data ?? null, loading: isLoading, error, mutate };
}

export interface TaskStats {
  byStatus: Record<string, number>;
}

export function useTaskStats() {
  const { data, error, isLoading, mutate } = useSWR<TaskStats>(
    getApiUrl('/api/tasks/stats'),
    fetcher
  );
  return { stats: data ?? null, loading: isLoading, error, mutate };
}

export function useTaskTemplates() {
  const { data, error, isLoading, mutate } = useSWR<TaskTemplate[]>(
    getApiUrl('/api/task-templates'),
    fetcher
  );
  return { templates: data ?? [], loading: isLoading, error, mutate };
}
