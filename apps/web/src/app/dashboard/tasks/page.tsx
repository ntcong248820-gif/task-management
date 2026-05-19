"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, KanbanSquare, ListTodo, Table2 } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const taskViews = [
  { value: "board", label: "Board", icon: KanbanSquare },
  { value: "timeline", label: "Timeline", icon: ListTodo },
  { value: "table", label: "Table", icon: Table2 },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
] as const

type TaskView = (typeof taskViews)[number]["value"]

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksFallback />}>
      <TasksContent />
    </Suspense>
  )
}

function TasksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedView = searchParams.get("view")
  const currentView = isTaskView(requestedView) ? requestedView : "board"

  function changeView(value: string) {
    router.replace(`/dashboard/tasks?view=${value}`, { scroll: false })
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Board, timeline, table, and calendar shells."
      />
      <div className="space-y-4 p-4 sm:p-6">
        <Tabs value={currentView} onValueChange={changeView}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto">
            {taskViews.map((view) => (
              <TabsTrigger key={view.value} value={view.value} className="gap-2">
                <view.icon className="h-4 w-4" />
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {taskViews.map((view) => (
            <TabsContent key={view.value} value={view.value} className="mt-4">
              <EmptyState
                icon={view.icon}
                title={`${view.label} view`}
                description="Task data will render here once task management views are connected."
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

function TasksFallback() {
  return (
    <div>
      <PageHeader title="Tasks" />
      <div className="p-4 sm:p-6">
        <EmptyState icon={KanbanSquare} title="Loading task view" />
      </div>
    </div>
  )
}

function isTaskView(value: string | null): value is TaskView {
  return taskViews.some((view) => view.value === value)
}
