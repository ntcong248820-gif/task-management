"use client"

import { useMemo, useState } from "react"
import {
  addMonths, eachDayOfInterval, format, isSameDay,
  parseISO, startOfMonth, endOfMonth, subMonths, differenceInDays,
} from "date-fns"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task.types"

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-slate-400",
  todo: "bg-blue-400",
  in_progress: "bg-purple-500",
  blocked: "bg-red-500",
  in_review: "bg-yellow-500",
  done: "bg-green-500",
}

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  const [baseDate, setBaseDate] = useState(() => startOfMonth(new Date()))
  const rangeStart = baseDate
  const rangeEnd = endOfMonth(baseDate)
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const totalDays = days.length

  const datedTasks = useMemo(
    () => tasks.filter((t) => t.startDate || t.dueDate),
    [tasks]
  )
  const undatedTasks = useMemo(
    () => tasks.filter((t) => !t.startDate && !t.dueDate),
    [tasks]
  )

  function barStyle(task: Task) {
    const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : null)
    const end = task.dueDate ? parseISO(task.dueDate) : (task.startDate ? parseISO(task.startDate) : null)
    if (!start || !end) return null

    const clampedStart = start < rangeStart ? rangeStart : start
    const clampedEnd = end > rangeEnd ? rangeEnd : end
    if (clampedStart > rangeEnd || clampedEnd < rangeStart) return null

    const leftDays = differenceInDays(clampedStart, rangeStart)
    const spanDays = differenceInDays(clampedEnd, clampedStart) + 1
    const left = (leftDays / totalDays) * 100
    const width = Math.max((spanDays / totalDays) * 100, 100 / totalDays)
    return { left: `${left}%`, width: `${width}%` }
  }

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBaseDate((d) => subMonths(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="w-32 text-center text-sm font-medium">{format(baseDate, "MMMM yyyy")}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBaseDate((d) => addMonths(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setBaseDate(startOfMonth(new Date()))}>
          Today
        </Button>
      </div>

      {datedTasks.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No tasks with dates" description="Set start or due dates on tasks to see them on the timeline." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          {/* Date header */}
          <div className="relative flex border-b bg-muted/50" style={{ minWidth: `${totalDays * 36}px` }}>
            <div className="w-48 shrink-0 border-r px-3 py-2 text-xs font-medium text-muted-foreground">Task</div>
            <div className="relative flex-1">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "absolute top-0 flex h-full flex-col items-center justify-center border-r px-1 text-xs",
                    isSameDay(day, new Date()) && "bg-primary/10 font-bold text-primary"
                  )}
                  style={{ left: `${(differenceInDays(day, rangeStart) / totalDays) * 100}%`, width: `${100 / totalDays}%` }}
                >
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div style={{ minWidth: `${totalDays * 36}px` }}>
            {datedTasks.map((task) => {
              const bar = barStyle(task)
              return (
                <div key={task.id} className="flex items-center border-b last:border-b-0 hover:bg-muted/30">
                  <div className="w-48 shrink-0 border-r px-3 py-2">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="line-clamp-1 text-left text-xs font-medium hover:text-primary"
                    >
                      {task.title}
                    </button>
                  </div>
                  <div className="relative flex-1 py-2" style={{ height: "36px" }}>
                    {bar && (
                      <button
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          "absolute top-1 h-5 rounded px-2 text-xs font-medium text-white truncate",
                          STATUS_COLORS[task.status] ?? "bg-slate-400"
                        )}
                        style={bar}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {undatedTasks.length > 0 && (
        <p className="text-xs text-muted-foreground">{undatedTasks.length} task{undatedTasks.length > 1 ? "s" : ""} have no dates and are not shown.</p>
      )}
    </div>
  )
}
