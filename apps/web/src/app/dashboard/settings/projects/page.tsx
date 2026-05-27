"use client"

import { useState } from "react"
import { FolderKanban, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { ProjectFormDialog } from "@/components/features/settings/project-form-dialog"
import { ProjectSettingsTable } from "@/components/features/settings/project-settings-table"
import { useProjects, useProjectMutations } from "@/hooks/use-projects-settings"
import type { Project } from "@repo/types"

export default function SettingsProjectsPage() {
  const { projects, loading, error, mutate } = useProjects()
  const { createProject, updateProject, deleteProject } = useProjectMutations(mutate)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(project: Project) {
    setEditTarget(project)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditTarget(null)
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage workspace projects and connect data sources."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        {error && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </p>
        )}

        {!loading && projects.length === 0 ? (
          <div className="flex flex-col items-center">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start tracking SEO tasks and correlating data."
            />
            <Button size="sm" onClick={openCreate} className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Create project
            </Button>
          </div>
        ) : (
          <ProjectSettingsTable
            projects={projects}
            loading={loading}
            onEdit={openEdit}
            onDelete={deleteProject}
          />
        )}
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        project={editTarget}
        onClose={closeDialog}
        onCreate={createProject}
        onUpdate={updateProject}
      />
    </div>
  )
}
