"use client"

import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table"
import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ArrowUpDown, ListTodo } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/task.types"

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-100 text-slate-600",
}

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  blocked: "Blocked", in_review: "In Review", done: "Done",
}

function formatMinutes(seconds: number): string {
  if (seconds === 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

interface TableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TableView({ tasks, onTaskClick }: TableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1" onClick={() => column.toggleSorting()}>
          Title <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <button
          onClick={() => onTaskClick(row.original)}
          className="max-w-[280px] truncate text-left text-sm font-medium hover:text-primary"
        >
          {row.getValue("title")}
        </button>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{STATUS_LABELS[getValue<string>()] ?? getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => (
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0", PRIORITY_COLORS[getValue<string>()])}>
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      accessorKey: "taskType",
      header: "Type",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue<string>() ?? "—"}</span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1" onClick={() => column.toggleSorting()}>
          Due <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return <span className="text-xs text-muted-foreground">{v ? format(parseISO(v), "MMM d, yyyy") : "—"}</span>
      },
    },
    {
      accessorKey: "timeSpent",
      header: "Time spent",
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{formatMinutes(getValue<number>())}</span>,
    },
  ]

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks" description="Create a task to get started." />
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b bg-muted/50">
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
