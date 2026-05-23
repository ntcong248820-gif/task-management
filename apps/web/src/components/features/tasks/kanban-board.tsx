"use client"

import { useState } from "react"
import { DndContext, DragOverlay, MouseSensor, TouchSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/config"
import { useTimerStore } from "@/stores/useTimerStore"
import { TaskCard } from "./task-card"
import { KanbanColumn } from "./kanban-column"
import type { Task } from "@/types/task.types"
import type { KeyedMutator } from "swr"

export const KANBAN_COLUMNS = ["backlog", "todo", "in_progress", "blocked", "in_review", "done"]

interface KanbanBoardProps {
  tasks: Task[];
  mutate: KeyedMutator<Task[]>;
  onTaskClick: (task: Task) => void;
  onCreateTask: (status: string) => void;
}

export function KanbanBoard({ tasks, mutate, onTaskClick, onCreateTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const { activeTaskId, activeTaskTitle, startTimer } = useTimerStore()

  // Require 8px movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return
    const newStatus = over.id as string
    if (!KANBAN_COLUMNS.includes(newStatus)) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return

    // Optimistic update
    mutate(tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus as Task["status"] } : t)), false)

    try {
      const res = await fetch(getApiUrl(`/api/tasks/${task.id}/move`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Move failed")
    } catch {
      mutate() // revert on failure
    }
  }

  async function handleTimerClick(taskId: string, taskTitle: string) {
    if (activeTaskId === taskId) {
      useTimerStore.getState().stopTimer()
      return
    }
    const result = await startTimer(taskId, taskTitle)
    if (result.error) {
      toast.warning(`Stop timer for "${activeTaskTitle}" first`)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            activeTaskId={activeTaskId}
            onTaskClick={onTaskClick}
            onTimerClick={handleTimerClick}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard task={activeTask} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
