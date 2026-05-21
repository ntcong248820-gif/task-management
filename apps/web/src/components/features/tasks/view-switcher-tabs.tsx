"use client"

import { useRouter } from "next/navigation"
import { CalendarDays, KanbanSquare, ListTodo, Table2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const VIEWS = [
  { value: "board", label: "Board", icon: KanbanSquare },
  { value: "timeline", label: "Timeline", icon: ListTodo },
  { value: "table", label: "Table", icon: Table2 },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
] as const

export type TaskView = (typeof VIEWS)[number]["value"]

interface ViewSwitcherTabsProps {
  active: TaskView;
}

export function ViewSwitcherTabs({ active }: ViewSwitcherTabsProps) {
  const router = useRouter()

  function changeView(value: string) {
    router.replace(`/dashboard/tasks?view=${value}`, { scroll: false })
  }

  return (
    <Tabs value={active} onValueChange={changeView}>
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto">
        {VIEWS.map((view) => (
          <TabsTrigger key={view.value} value={view.value} className="gap-2">
            <view.icon className="h-4 w-4" />
            {view.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function isTaskView(value: string | null): value is TaskView {
  return VIEWS.some((v) => v.value === value)
}
