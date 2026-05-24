"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiUrl } from "@/lib/config"
import { useWorkspaceStore } from "@/stores/use-workspace-store"
import type { KeyedMutator } from "swr"
import type { Task } from "@/types/task.types"

interface CreateTaskDialogProps {
  open: boolean;
  projectId: string | null;
  defaultStatus?: string;
  defaultSprintId?: string | null;
  onClose: () => void;
  mutate: KeyedMutator<Task[]>;
}

export function CreateTaskDialog({ open, projectId, defaultStatus = "backlog", defaultSprintId = null, onClose, mutate }: CreateTaskDialogProps) {
  const projects = useWorkspaceStore((state) => state.projects)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? "")

  // Sync project selection when dialog opens or prop changes
  useEffect(() => {
    if (open) setSelectedProjectId(projectId ?? projects[0]?.id ?? "")
  }, [open, projectId, projects])
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState("medium")
  const [dueDate, setDueDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle("")
    setStatus(defaultStatus)
    setPriority("medium")
    setDueDate("")
    setSelectedProjectId(projectId ?? "")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedProjectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(getApiUrl("/api/tasks"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId: selectedProjectId,
          sprintId: defaultSprintId,
          status,
          priority,
          dueDate: dueDate || null,
          affectsWebsite: true,
          isRecurring: false,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create task")
      await mutate()
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No projects found. Create a project first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["backlog","todo","in_progress","blocked","in_review","done"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["urgent","high","medium","low"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || !selectedProjectId || loading}>
              {loading ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
