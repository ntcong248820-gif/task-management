"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { KanbanBoard } from "@/components/KanbanBoard"
import { TaskDialog } from "@/components/TaskDialog"
import { TaskFilters } from "@/components/TaskFilters"
import { getApiUrl } from "@/lib/config"
import type { Project } from "@/types/task.types"

export default function TasksPage() {
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [projects, setProjects] = useState<Project[]>([])

  // Fetch projects for filter
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch(getApiUrl("/api/projects"))
      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }

  const handleTaskSuccess = () => {
    setRefreshKey(prev => prev + 1) // Trigger refresh
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your SEO tasks with Kanban board and time tracking
          </p>
        </div>
        <Button onClick={() => setIsNewTaskOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters
        searchQuery={searchQuery}
        selectedProject={selectedProject}
        selectedStatus={selectedStatus}
        projects={projects}
        onSearchChange={setSearchQuery}
        onProjectChange={setSelectedProject}
        onStatusChange={setSelectedStatus}
      />

      <KanbanBoard
        key={refreshKey}
        searchQuery={searchQuery}
        selectedProject={selectedProject}
        selectedStatus={selectedStatus}
      />

      <TaskDialog
        mode="create"
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        onSuccess={handleTaskSuccess}
      />
    </div>
  )
}
