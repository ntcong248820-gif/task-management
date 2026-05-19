"use client"

import { useEffect } from "react"
import { FolderKanban } from "lucide-react"

import { useProjectStore } from "@/stores/use-project-store"
import { useWorkspaceStore } from "@/stores/use-workspace-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProjectSelector() {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId)
  const setSelectedProjectId = useProjectStore((state) => state.setSelectedProjectId)
  const projects = useWorkspaceStore((state) => state.projects)
  const projectsLoading = useWorkspaceStore((state) => state.projectsLoading)
  const fetchProjects = useWorkspaceStore((state) => state.fetchProjects)
  const workspaceId = useWorkspaceStore((state) => state.workspaceId)

  useEffect(() => {
    if (workspaceId) void fetchProjects()
  }, [fetchProjects, workspaceId])

  return (
    <Select
      value={selectedProjectId ?? ""}
      onValueChange={(value) => setSelectedProjectId(value)}
      disabled={projectsLoading || projects.length === 0}
    >
      <SelectTrigger className="h-9 w-[150px] sm:w-[220px]">
        <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder={projectsLoading ? "Loading" : "Project"} />
      </SelectTrigger>
      <SelectContent className="z-dropdown">
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="flex flex-col">
              <span>{project.name}</span>
              {project.domain ? (
                <span className="text-xs text-muted-foreground">{project.domain}</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
