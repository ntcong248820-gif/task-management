"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { format, isPast, parseISO } from "date-fns"
import { Clock, Timer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task.types"

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
}

const TYPE_LABELS: Record<string, string> = {
  technical: "Tech",
  content: "Content",
  links: "Links",
  planning: "Plan",
  meeting: "Meet",
  audit: "Audit",
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onTimerClick?: (e: React.MouseEvent) => void;
  isTimerActive?: boolean;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, onTimerClick, isTimerActive = false, isDragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })
  const style = { transform: CSS.Translate.toString(transform) }

  const isOverdue = task.dueDate && !task.completedAt && isPast(parseISO(task.dueDate))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-40 shadow-lg ring-2 ring-primary"
      )}
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
        {onTimerClick && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100", isTimerActive && "opacity-100 text-green-600")}
            onClick={(e) => { e.stopPropagation(); onTimerClick(e); }}
          >
            <Timer className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0", PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </Badge>
        {task.taskType && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {TYPE_LABELS[task.taskType] ?? task.taskType}
          </Badge>
        )}
        {task.dueDate && (
          <span className={cn("ml-auto flex items-center gap-0.5 text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
            <Clock className="h-3 w-3" />
            {format(parseISO(task.dueDate), "MMM d")}
          </span>
        )}
      </div>

      {(task.timeSpent > 0 || task.estimatedTime) && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span>{formatSeconds(task.timeSpent)}</span>
          {task.estimatedTime && task.estimatedTime > 0 && (
            <span>/ {formatSeconds(task.estimatedTime)}</span>
          )}
        </div>
      )}
    </div>
  )
}
