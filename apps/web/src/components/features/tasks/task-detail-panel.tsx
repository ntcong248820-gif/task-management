"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getApiUrl } from "@/lib/config"
import { SELECT_NONE_VALUE, nullableSelectResult, nullableSelectValue } from "@/lib/select-values"
import { TaskTimerSection } from "./task-timer-section"
import { useGoals } from "@/hooks/use-goals"
import { useSprints } from "@/hooks/use-sprints"
import type { Task } from "@/types/task.types"
import type { KeyedMutator } from "swr"

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  mutate: KeyedMutator<Task[]>;
}

async function patchTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  try {
    const res = await fetch(getApiUrl(`/api/tasks/${id}`), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    return json.success ? json.data : null
  } catch {
    return null
  }
}

export function TaskDetailPanel({ task, open, onClose, mutate }: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [urlError, setUrlError] = useState<string | null>(null)
  const { goals } = useGoals({ projectId: task?.projectId })
  // Only show actionable sprints (planning or active) in the selector
  const { sprints: planningSprints } = useSprints({ projectId: task?.projectId, status: 'planning' })
  const { sprints: activeSprints } = useSprints({ projectId: task?.projectId, status: 'active' })
  const sprints = [...activeSprints, ...planningSprints]

  // Reset title field whenever the selected task changes
  useEffect(() => {
    setTitle(task?.title ?? "")
  }, [task?.id, task?.title])

  async function save(patch: Partial<Task>) {
    if (!task) return
    const updated = await patchTask(task.id, patch)
    if (updated) mutate()
  }

  async function handleComplete() {
    if (!task) return
    await fetch(getApiUrl(`/api/tasks/${task.id}/complete`), { method: "POST", credentials: "include" })
    mutate()
    onClose()
  }

  async function handleDelete() {
    if (!task || !confirm(`Delete "${task.title}"?`)) return
    await fetch(getApiUrl(`/api/tasks/${task.id}`), { method: "DELETE", credentials: "include" })
    mutate()
    onClose()
  }

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      {/* key forces re-mount when task changes, resetting all uncontrolled inputs */}
      <SheetContent key={task.id} side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="sr-only">Task detail</SheetTitle>
          <Input
            data-field="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && save({ title: title.trim() })}
            className="border-0 p-0 text-base font-semibold shadow-none focus-visible:ring-0"
          />
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* Status / Priority / Type row */}
          <div className="grid grid-cols-3 gap-3">
            {(["status", "priority", "taskType"] as const).map((field) => (
              <div key={field}>
                <Label className="text-xs capitalize text-muted-foreground">{field === "taskType" ? "Type" : field}</Label>
                <Select
                  value={(task[field] as string) ?? ""}
                  onValueChange={(v) => save({ [field]: v || null } as Partial<Task>)}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {field === "status" && ["backlog","todo","in_progress","blocked","in_review","done"].map((v) => (
                      <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>
                    ))}
                    {field === "priority" && ["low","medium","high","urgent"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                    {field === "taskType" && ["technical","content","links","planning","meeting","audit"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            {(["startDate", "dueDate"] as const).map((field) => (
              <div key={field}>
                <Label className="text-xs text-muted-foreground">{field === "startDate" ? "Start date" : "Due date"}</Label>
                <Input
                  type="date"
                  className="mt-1 h-8 text-xs"
                  defaultValue={(task[field] as string) ?? ""}
                  onBlur={(e) => save({ [field]: e.target.value || null } as Partial<Task>)}
                />
              </div>
            ))}
          </div>

          {/* Goal / Sprint */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Goal</Label>
              <Select
                value={nullableSelectValue(task.goalId)}
                onValueChange={(v) => save({ goalId: nullableSelectResult(v) })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sprint</Label>
              <Select
                value={nullableSelectValue(task.sprintId)}
                onValueChange={(v) => save({ sprintId: nullableSelectResult(v) })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE_VALUE}>—</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target URL */}
          <div>
            <Label className="text-xs text-muted-foreground">Target URL</Label>
            <Input
              type="url"
              className="mt-1 h-8 text-xs"
              defaultValue={task.targetUrl ?? ""}
              placeholder="https://..."
              onBlur={(e) => {
                const val = e.target.value.trim()
                if (!val) {
                  setUrlError(null)
                  save({ targetUrl: null })
                } else if (val.startsWith("https://") || val.startsWith("http://")) {
                  setUrlError(null)
                  save({ targetUrl: val })
                } else {
                  setUrlError("URL must start with https:// or http://")
                }
              }}
            />
            {urlError && <p className="mt-1 text-xs text-destructive">{urlError}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              className="mt-1 min-h-[80px] text-sm"
              defaultValue={task.description ?? ""}
              onBlur={(e) => save({ description: e.target.value || null })}
            />
          </div>

          {/* Timer */}
          <TaskTimerSection
            taskId={task.id}
            taskTitle={task.title}
            timeSpent={task.timeSpent}
            estimatedTime={task.estimatedTime}
            onStop={(elapsed) => {
              // Optimistically update timeSpent in SWR cache so UI reflects new total
              // immediately, without waiting for the refetch round-trip
              mutate(
                (current) => current?.map((t) =>
                  t.id === task.id ? { ...t, timeSpent: (t.timeSpent ?? 0) + elapsed } : t
                ),
                { revalidate: true }
              )
            }}
          />
        </div>

        {/* Footer actions */}
        <div className="border-t p-4 flex items-center justify-between gap-2">
          {task.status !== "done" ? (
            <Button size="sm" onClick={handleComplete} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Mark done
            </Button>
          ) : (
            <div className="text-xs text-muted-foreground">Completed</div>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
