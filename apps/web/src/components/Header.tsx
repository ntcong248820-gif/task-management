"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Bell } from "lucide-react"
import { getApiUrl } from "@/lib/config"

interface Project {
  id: number
  name: string
  client: string | null
  domain: string | null
  status: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export function Header() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(getApiUrl("/api/projects"))
        const data = await response.json()

        if (data.success) {
          setProjects(data.data)
          if (data.data.length > 0) {
            setSelectedProject(data.data[0].id.toString())
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (loading) {
    return (
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="animate-pulse">Loading projects...</div>
      </header>
    )
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left: Project Selector */}
      <div className="flex items-center gap-4">
        <div className="min-w-[280px]">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.domain}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <div className="flex items-center gap-3 rounded-lg border px-3 py-1.5">
          <div className="text-sm">
            <p className="font-medium">Current Project</p>
            <p className="text-xs text-muted-foreground">
              {projects.find((p) => p.id.toString() === selectedProject)?.domain || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
