"use client"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiUrl } from '@/lib/config';

interface TimerState {
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  isRunning: boolean;
  startTime: number | null;
  elapsedSeconds: number;

  startTimer: (taskId: string, taskTitle: string) => Promise<{ error?: string; activeTaskId?: string }>;
  stopTimer: (note?: string) => Promise<void>;
  syncFromDb: () => Promise<void>;
  tick: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTaskId: null,
      activeTaskTitle: null,
      isRunning: false,
      startTime: null,
      elapsedSeconds: 0,

      startTimer: async (taskId, taskTitle) => {
        const state = get();
        if (state.activeTaskId === taskId && state.isRunning) return {};

        try {
          const res = await fetch(getApiUrl('/api/time-logs/start'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            // 409 = another timer active
            return { error: json.error, activeTaskId: json.data?.activeTaskId };
          }
          set({ activeTaskId: taskId, activeTaskTitle: taskTitle, isRunning: true, startTime: Date.now(), elapsedSeconds: 0 });
          return {};
        } catch {
          return { error: 'Failed to start timer' };
        }
      },

      stopTimer: async (note?: string) => {
        const state = get();
        if (!state.activeTaskId) return;
        try {
          await fetch(getApiUrl('/api/time-logs/stop'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note ?? null }),
          });
        } catch {
          // best-effort — reset local state regardless
        }
        set({ activeTaskId: null, activeTaskTitle: null, isRunning: false, startTime: null, elapsedSeconds: 0 });
      },

      syncFromDb: async () => {
        try {
          const res = await fetch(getApiUrl('/api/time-logs?limit=1'), { credentials: 'include' });
          if (!res.ok) return;
          const json = await res.json();
          // Find active log (no endedAt) for this user — API returns all logs sorted by startedAt desc
          // If the first log has no endedAt, we have an active timer
          const active = (json.data ?? []).find((l: any) => l.endedAt == null);
          if (active) {
            const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
            set({ activeTaskId: active.taskId, isRunning: true, startTime: Date.now() - elapsed * 1000, elapsedSeconds: elapsed });
          } else {
            set({ activeTaskId: null, isRunning: false, startTime: null, elapsedSeconds: 0 });
          }
        } catch {
          // ignore sync errors
        }
      },

      tick: () => {
        const state = get();
        if (!state.isRunning || !state.startTime) return;
        set({ elapsedSeconds: Math.floor((Date.now() - state.startTime) / 1000) });
      },

      reset: () => {
        set({ activeTaskId: null, activeTaskTitle: null, isRunning: false, startTime: null, elapsedSeconds: 0 });
      },
    }),
    {
      name: 'timer-storage',
      partialize: (s) => ({
        activeTaskId: s.activeTaskId,
        activeTaskTitle: s.activeTaskTitle,
        isRunning: s.isRunning,
        startTime: s.startTime,
      }),
    }
  )
);
