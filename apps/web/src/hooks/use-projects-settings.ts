"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { getApiUrl } from "@/lib/config"
import { useWorkspaceStore } from "@/stores/use-workspace-store"
import { useProjectStore } from "@/stores/use-project-store"
import type { Project } from "@repo/types"

const PROJECTS_KEY = "/api/projects"

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    getApiUrl(PROJECTS_KEY),
    fetcher
  )
  return { projects: data ?? [], loading: isLoading, error, mutate }
}

interface CreateProjectPayload {
  name: string
  domain?: string | null
  description?: string | null
  color?: string | null
  isActive: boolean
}

interface UpdateProjectPayload {
  name?: string
  domain?: string | null
  description?: string | null
  color?: string | null
  isActive?: boolean
}

export function useProjectMutations(mutate: () => Promise<unknown>) {
  const fetchProjects = useWorkspaceStore((s) => s.fetchProjects)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId)

  async function createProject(payload: CreateProjectPayload): Promise<Project> {
    const res = await fetch(getApiUrl(PROJECTS_KEY), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      const msg = json.error ?? "Failed to create project"
      throw new Error(isDuplicateDomain(msg) ? "Domain already used in this workspace" : msg)
    }
    const created: Project = json.data
    await mutate()
    await fetchProjects()
    // Auto-select if no project currently selected
    if (!selectedProjectId) {
      setSelectedProjectId(created.id)
    }
    return created
  }

  async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const res = await fetch(getApiUrl(`${PROJECTS_KEY}/${id}`), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      const msg = json.error ?? "Failed to update project"
      throw new Error(isDuplicateDomain(msg) ? "Domain already used in this workspace" : msg)
    }
    await mutate()
    await fetchProjects()
    return json.data as Project
  }

  async function deleteProject(id: string): Promise<void> {
    const res = await fetch(getApiUrl(`${PROJECTS_KEY}/${id}`), {
      method: "DELETE",
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Failed to delete project")
    }
    await mutate()
    // fetchProjects handles re-selection: if deleted project was active, it picks next or null
    await fetchProjects()
  }

  return { createProject, updateProject, deleteProject }
}

function isDuplicateDomain(msg: string): boolean {
  // Server returns specific error message for domain uniqueness violations
  return msg.toLowerCase().includes("domain already used")
}
