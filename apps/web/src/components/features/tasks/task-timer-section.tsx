"use client"

import { useEffect } from "react"
import { Play, Square, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTimerStore } from "@/stores/useTimerStore"
import { cn } from "@/lib/utils"

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

interface TaskTimerSectionProps {
  taskId: string;
  taskTitle: string;
  timeSpent: number;
  estimatedTime?: number | null;
}

export function TaskTimerSection({ taskId, taskTitle, timeSpent, estimatedTime }: TaskTimerSectionProps) {
  const { activeTaskId, activeTaskTitle, isRunning, elapsedSeconds, startTimer, stopTimer, tick } = useTimerStore()

  const isMyTimer = activeTaskId === taskId
  const isOtherTimer = activeTaskId !== null && activeTaskId !== taskId

  // Tick every second when this task's timer is running
  useEffect(() => {
    if (!isMyTimer || !isRunning) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isMyTimer, isRunning, tick])

  async function handleStart() {
    await startTimer(taskId, taskTitle)
  }

  const displayElapsed = isMyTimer ? elapsedSeconds : 0
  const totalSpent = timeSpent + displayElapsed
  const progress = estimatedTime && estimatedTime > 0 ? Math.min((totalSpent / estimatedTime) * 100, 100) : null

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Tracking</h4>

      <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
        <div>
          <div className={cn("text-2xl font-mono font-semibold tabular-nums", isMyTimer && isRunning && "text-green-600")}>
            {isMyTimer ? formatSeconds(displayElapsed) : formatSeconds(0)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Total: {formatSeconds(totalSpent)}
            {estimatedTime && estimatedTime > 0 ? ` / ${formatSeconds(estimatedTime)}` : ""}
          </div>
        </div>

        {isMyTimer ? (
          <Button variant="destructive" size="sm" onClick={() => stopTimer()} className="gap-1.5">
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStart}
            disabled={isOtherTimer}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
        )}
      </div>

      {isOtherTimer && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Stop timer for <strong>{activeTaskTitle}</strong> first</span>
        </div>
      )}

      {progress !== null && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-red-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
