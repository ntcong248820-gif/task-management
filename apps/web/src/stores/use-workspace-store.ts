"use client"

import { create } from "zustand"
import type { ApiResponse, Project } from "@repo/types"

import { getApiUrl } from "@/lib/config"
import { useProjectStore } from "@/stores/use-project-store"

interface WorkspaceStore {
  workspaceId: string | null
  workspaceName: string
  projects: Project[]
  projectsError: string | null
  projectsLoading: boolean
  setWorkspace: (id: string | null, name?: string) => void
  fetchProjects: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaceId: null,
  workspaceName: "",
  projects: [],
  projectsError: null,
  projectsLoading: false,
  setWorkspace: (id, name = "") => set({ workspaceId: id, workspaceName: name }),
  fetchProjects: async () => {
    set({ projectsLoading: true, projectsError: null })

    try {
      const response = await fetch(getApiUrl("/api/projects"), {
        credentials: "include",
      })
      const json = (await response.json()) as ApiResponse<Project[]>

      if (!response.ok || !json.success) {
        throw new Error(json.error || `${response.status} ${response.statusText}`)
      }

      const projects = json.data ?? []
      const selectedProjectId = useProjectStore.getState().selectedProjectId
      const selectedStillExists = projects.some((project) => project.id === selectedProjectId)

      if (!selectedStillExists) {
        useProjectStore.getState().setSelectedProjectId(projects[0]?.id ?? null)
      }

      set({ projects, projectsLoading: false })
    } catch (error) {
      set({
        projects: [],
        projectsError: error instanceof Error ? error.message : "Unable to load projects",
        projectsLoading: false,
      })
      useProjectStore.getState().setSelectedProjectId(null)
    }
  },
}))
