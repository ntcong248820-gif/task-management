"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProjectStore } from "@/stores/use-project-store"
import type { Project } from "@repo/types"

interface ProjectSettingsTableProps {
  projects: Project[]
  loading: boolean
  onEdit: (project: Project) => void
  onDelete: (id: string) => Promise<void>
}

export function ProjectSettingsTable({ projects, loading, onEdit, onDelete }: ProjectSettingsTableProps) {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmTarget = projects.find((p) => p.id === confirmId)

  async function handleConfirmDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await onDelete(confirmId)
      toast.success("Project deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project")
    } finally {
      setDeleting(false)
      setConfirmId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <LoadingSkeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Project</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Domain</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const isSelected = project.id === selectedProjectId
              return (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {project.color && (
                        <span
                          className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <span className="font-medium">{project.name}</span>
                      {isSelected && (
                        <span className="flex items-center gap-0.5 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-0.5 pl-[18px] text-xs text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {project.domain ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={project.isActive ? "default" : "secondary"} className="text-xs">
                      {project.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onEdit(project)}
                        title="Edit project"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setConfirmId(project.id)}
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(confirmId)} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deleting <strong>{confirmTarget?.name}</strong> will permanently remove all associated
            connections, synced data, and tasks. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
