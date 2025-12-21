"use client"

import { useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTimerStore } from '@/stores/useTimerStore';
import { formatTime } from '@/lib/formatTime';

export function TimerWidget() {
    const {
        activeTask,
        isRunning,
        elapsedTime,
        pauseTimer,
        resumeTimer,
        stopTimer,
        tick
    } = useTimerStore();

    // Tick every second when running
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            tick();
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, tick]);

    // No active task
    if (!activeTask) {
        return (
            <Card className="p-3 bg-muted/50">
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Square className="h-4 w-4 mr-2" />
                    No active timer
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-3 bg-card border-2 border-primary/20">
            {/* Task Info */}
            <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-xs font-medium text-muted-foreground">
                        {isRunning ? 'TRACKING' : 'PAUSED'}
                    </span>
                </div>
                <h4 className="text-sm font-semibold line-clamp-2 mb-1">
                    {activeTask.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                    Task #{activeTask.id}
                </p>
            </div>

            {/* Timer Display */}
            <div className="mb-3">
                <div className="text-2xl font-mono font-bold text-center py-2 bg-muted/50 rounded-md">
                    {formatTime(elapsedTime)}
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
                {isRunning ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={pauseTimer}
                    >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={resumeTimer}
                    >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                    </Button>
                )}

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={stopTimer}
                >
                    <Square className="h-4 w-4" />
                </Button>
            </div>

            {/* Estimated Time */}
            {activeTask.estimatedTime && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                    Est: {formatTime(activeTask.estimatedTime)}
                </div>
            )}
        </Card>
    );
}
