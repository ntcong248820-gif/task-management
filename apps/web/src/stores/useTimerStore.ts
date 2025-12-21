"use client"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiUrl } from '@/lib/config';
import type { Task } from '@/types/task.types';

interface TimerState {
    // Current state
    activeTask: Task | null;
    isRunning: boolean;
    startTime: number | null; // Timestamp when timer started
    elapsedTime: number; // Total elapsed seconds
    pausedTime: number | null; // Timestamp when paused

    // Actions
    startTimer: (task: Task) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => Promise<void>;
    tick: () => void;
    reset: () => void;
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set, get) => ({
            // Initial state
            activeTask: null,
            isRunning: false,
            startTime: null,
            elapsedTime: 0,
            pausedTime: null,

            // Start timer for a task
            startTimer: (task: Task) => {
                const state = get();

                // If there's already an active task, stop it first
                if (state.activeTask && state.activeTask.id !== task.id) {
                    state.stopTimer();
                }

                set({
                    activeTask: task,
                    isRunning: true,
                    startTime: Date.now(),
                    elapsedTime: 0,
                    pausedTime: null,
                });
            },

            // Pause the timer
            pauseTimer: () => {
                const state = get();
                if (!state.isRunning) return;

                set({
                    isRunning: false,
                    pausedTime: Date.now(),
                });
            },

            // Resume the timer
            resumeTimer: () => {
                const state = get();
                if (state.isRunning || !state.activeTask) return;

                // Calculate time spent while paused
                const pauseDuration = state.pausedTime
                    ? Date.now() - state.pausedTime
                    : 0;

                set({
                    isRunning: true,
                    startTime: state.startTime ? state.startTime + pauseDuration : Date.now(),
                    pausedTime: null,
                });
            },

            // Stop timer and save time log
            stopTimer: async () => {
                const state = get();
                if (!state.activeTask) return;

                const finalElapsedTime = state.elapsedTime;
                const taskId = state.activeTask.id;

                // Save time log to API
                try {
                    const response = await fetch(getApiUrl('/api/time-logs'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            taskId,
                            duration: finalElapsedTime,
                            startTime: new Date(state.startTime!).toISOString(),
                            endTime: new Date().toISOString(),
                        }),
                    });

                    if (!response.ok) {
                        console.error('Failed to save time log');
                    }

                    // Update task's timeSpent
                    await fetch(getApiUrl(`/api/tasks/${taskId}`), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            timeSpent: (state.activeTask.timeSpent || 0) + finalElapsedTime,
                        }),
                    });
                } catch (error) {
                    console.error('Error saving time log:', error);
                }

                // Reset timer state
                set({
                    activeTask: null,
                    isRunning: false,
                    startTime: null,
                    elapsedTime: 0,
                    pausedTime: null,
                });
            },

            // Update elapsed time (called every second)
            tick: () => {
                const state = get();
                if (!state.isRunning || !state.startTime) return;

                const now = Date.now();
                const elapsed = Math.floor((now - state.startTime) / 1000);

                set({ elapsedTime: elapsed });
            },

            // Reset timer without saving
            reset: () => {
                set({
                    activeTask: null,
                    isRunning: false,
                    startTime: null,
                    elapsedTime: 0,
                    pausedTime: null,
                });
            },
        }),
        {
            name: 'timer-storage',
            partialize: (state) => ({
                activeTask: state.activeTask,
                isRunning: state.isRunning,
                startTime: state.startTime,
                elapsedTime: state.elapsedTime,
                pausedTime: state.pausedTime,
            }),
        }
    )
);
