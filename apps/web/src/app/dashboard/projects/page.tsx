"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, Plus } from "lucide-react"

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/projects")
        const data = await response.json()

        if (data.success) {
          setProjects(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your SEO projects and clients
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-muted-foreground">
            Loading projects...
          </div>
        ) : (
          <>
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    {project.name}
                  </CardTitle>
                  <CardDescription>{project.client || "No client"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Domain:</span>
                      <span className="font-medium">{project.domain || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Add new project card */}
            <Card className="border-dashed">
              <CardContent className="flex h-full items-center justify-center p-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-semibold">Add New Project</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a new SEO project
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
