"use client"

import { useMemo, useState } from "react"
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task.types"

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-slate-200 text-slate-800",
  todo: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  blocked: "bg-red-100 text-red-800",
  in_review: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-800",
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        "w-full truncate rounded px-1 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80",
        STATUS_COLORS[task.status] ?? "bg-slate-100 text-slate-700"
      )}
      title={task.title}
    >
      {task.title}
    </button>
  )
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [baseDate, setBaseDate] = useState(() => startOfMonth(new Date()))

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(baseDate)
    const monthEnd = endOfMonth(baseDate)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    })
  }, [baseDate])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate
      map.set(key, [...(map.get(key) ?? []), task])
    }
    return map
  }, [tasks])

  const hasTasks = tasks.some((t) => t.dueDate)
  const today = new Date()

  if (!hasTasks) {
    return <EmptyState icon={CalendarDays} title="No tasks with due dates" description="Set a due date on tasks to see them on the calendar." />
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

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px rounded-t-lg border bg-muted text-center">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="bg-background py-2 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-b-lg border bg-muted">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayTasks = tasksByDate.get(dateKey) ?? []
          const visible = dayTasks.slice(0, 3)
          const overflow = dayTasks.length - 3
          const isToday = isSameDay(day, today)
          const isCurrentMonth = isSameMonth(day, baseDate)

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[100px] bg-background p-1.5",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <div className={cn(
                "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </div>

              <div className="space-y-0.5">
                {visible.map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
                {overflow > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full rounded px-1 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted">
                        +{overflow} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{format(day, "MMMM d")}</p>
                      <div className="space-y-1">
                        {dayTasks.map((task) => (
                          <TaskChip key={task.id} task={task} onClick={() => onTaskClick(task)} />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
