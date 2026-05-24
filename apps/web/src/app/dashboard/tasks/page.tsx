"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { KanbanBoard } from "@/components/features/tasks/kanban-board"
import { TimelineView } from "@/components/features/tasks/timeline-view"
import { TableView } from "@/components/features/tasks/table-view"
import { CalendarView } from "@/components/features/tasks/calendar-view"
import { TaskDetailPanel } from "@/components/features/tasks/task-detail-panel"
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog"
import { TaskFiltersBar, DEFAULT_FILTERS, type TaskFilters } from "@/components/features/tasks/task-filters-bar"
import { ViewSwitcherTabs, isTaskView, type TaskView } from "@/components/features/tasks/view-switcher-tabs"
import { useTasks, useTaskTemplates } from "@/hooks/use-tasks"
import { useProjectStore } from "@/stores/use-project-store"
import { useWorkspaceStore } from "@/stores/use-workspace-store"
import { useTimerStore } from "@/stores/useTimerStore"
import { getApiUrl } from "@/lib/config"
import type { Task } from "@/types/task.types"

export default function TasksPage() {
  return (
    <Suspense fallback={<PageHeader title="Tasks" />}>
      <TasksContent />
    </Suspense>
  )
}

function TasksContent() {
  const searchParams = useSearchParams()
  const rawView = searchParams.get("view")
  const sprintId = searchParams.get("sprintId")
  const view: TaskView = isTaskView(rawView) ? rawView : "board"

  const { selectedProjectId } = useProjectStore()
  const projects = useWorkspaceStore((state) => state.projects)
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createStatus, setCreateStatus] = useState<string | null>(null)

  const apiFilters = useMemo(
    () => ({
      projectId: selectedProjectId,
      ...(sprintId ? { sprintId } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    }),
    [selectedProjectId, sprintId, filters.status, filters.search]
  )

  const { tasks, loading, mutate } = useTasks(apiFilters)
  // Derive from SWR cache so it stays fresh when mutate() revalidates
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId])
  const { templates } = useTaskTemplates()
  const { syncFromDb } = useTimerStore()

  // Reconcile timer state with DB on mount (handles cross-device / server-stopped timers)
  useEffect(() => { syncFromDb() }, [syncFromDb])

  // Client-side priority filter (server handles status + search)
  const filtered = useMemo(
    () => (filters.priority !== "all" ? tasks.filter((t) => t.priority === filters.priority) : tasks),
    [tasks, filters.priority]
  )

  // Lazy template spawn on mount — idempotent via ON CONFLICT DO NOTHING
  useEffect(() => {
    if (!selectedProjectId || !templates.length || !tasks.length) return
    const today = format(new Date(), "yyyy-MM-dd")
    for (const template of templates.filter((t) => t.isActive)) {
      const alreadySpawned = tasks.some(
        (t) => t.recurringTemplateId === template.id && t.startDate === today
      )
      if (!alreadySpawned) {
        fetch(getApiUrl(`/api/task-templates/${template.id}/spawn`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: selectedProjectId, startDate: today }),
        }).then(() => mutate())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length, selectedProjectId])

  function openDetail(task: Task) {
    setSelectedTaskId(task.id)
  }

  if (!selectedProjectId) {
    const noProjects = projects.length === 0
    return (
      <div className="p-6 space-y-4">
        <EmptyState
          icon={Plus}
          title={noProjects ? "No projects yet" : "No project selected"}
          description={
            noProjects
              ? "Create your first project to start managing tasks."
              : "Select a project from the header to view tasks."
          }
        />
        {noProjects && (
          <div className="flex justify-center">
            <Button asChild size="sm">
              <Link href="/dashboard/settings/projects">Create project</Link>
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description={sprintId ? "Sprint-filtered board, timeline, table, and calendar views." : "Board, timeline, table, and calendar views."}
        actions={
          <Button size="sm" onClick={() => setCreateStatus("backlog")} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <ViewSwitcherTabs active={view} />
          <TaskFiltersBar filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</div>
        ) : (
          <>
            {view === "board" && (
              <KanbanBoard
                tasks={filtered}
                mutate={mutate}
                onTaskClick={openDetail}
                onCreateTask={(status) => setCreateStatus(status)}
              />
            )}
            {view === "timeline" && <TimelineView tasks={filtered} onTaskClick={openDetail} />}
            {view === "table" && <TableView tasks={filtered} onTaskClick={openDetail} />}
            {view === "calendar" && <CalendarView tasks={filtered} onTaskClick={openDetail} />}
          </>
        )}
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        mutate={mutate}
      />

      <CreateTaskDialog
        open={createStatus !== null}
        projectId={selectedProjectId}
        defaultStatus={createStatus ?? "backlog"}
        defaultSprintId={sprintId}
        onClose={() => setCreateStatus(null)}
        mutate={mutate}
      />
    </>
  )
}
