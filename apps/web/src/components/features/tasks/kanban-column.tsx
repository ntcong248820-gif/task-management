"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TaskCard } from "./task-card"
import type { Task } from "@/types/task.types"

export const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  in_review: "In Review",
  done: "Done",
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-slate-100 border-slate-200",
  todo: "bg-blue-50 border-blue-100",
  in_progress: "bg-purple-50 border-purple-100",
  blocked: "bg-red-50 border-red-100",
  in_review: "bg-yellow-50 border-yellow-100",
  done: "bg-green-50 border-green-100",
}

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  activeTaskId: string | null;
  onTaskClick: (task: Task) => void;
  onTimerClick: (taskId: string, taskTitle: string) => void;
  onCreateTask: (status: string) => void;
}

export function KanbanColumn({
  status, tasks, activeTaskId, onTaskClick, onTimerClick, onCreateTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className={cn(
      "flex min-w-[280px] max-w-[320px] flex-col rounded-lg border p-3 transition-colors",
      STATUS_COLORS[status] ?? "bg-muted/50",
      isOver && "ring-2 ring-primary ring-offset-1"
    )}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{STATUS_LABELS[status] ?? status}</span>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCreateTask(status)}
            title="Add task"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn("flex flex-1 flex-col gap-2 min-h-[80px] rounded-md p-1 transition-colors", isOver && "bg-primary/5")}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onTimerClick={() => onTimerClick(task.id, task.title)}
            isTimerActive={activeTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border-2 border-dashed py-8 text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}
