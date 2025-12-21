"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Project, TaskStatus, TaskPriority } from "@/types/task.types"

interface NewTaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onTaskCreated?: () => void
}

export function NewTaskDialog({ open, onOpenChange, onTaskCreated }: NewTaskDialogProps) {
    const [projects, setProjects] = useState<Project[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        projectId: "",
        title: "",
        description: "",
        status: "todo" as TaskStatus,
        priority: "medium" as TaskPriority,
        estimatedTime: "",
        tags: "",
    })

    useEffect(() => {
        if (open) {
            fetchProjects()
        }
    }, [open])

    const fetchProjects = async () => {
        try {
            const response = await fetch("http://localhost:3001/api/projects")
            const data = await response.json()
            if (data.success) {
                setProjects(data.data)
                if (data.data.length > 0) {
                    setFormData(prev => ({ ...prev, projectId: data.data[0].id.toString() }))
                }
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const tagsArray = formData.tags
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)

            const estimatedTimeSeconds = formData.estimatedTime
                ? parseInt(formData.estimatedTime) * 3600 // Convert hours to seconds
                : undefined

            const response = await fetch("http://localhost:3001/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectId: parseInt(formData.projectId),
                    title: formData.title,
                    description: formData.description || undefined,
                    status: formData.status,
                    priority: formData.priority,
                    estimatedTime: estimatedTimeSeconds,
                    tags: tagsArray.length > 0 ? tagsArray : undefined,
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Reset form
                setFormData({
                    projectId: projects[0]?.id.toString() || "",
                    title: "",
                    description: "",
                    status: "todo",
                    priority: "medium",
                    estimatedTime: "",
                    tags: "",
                })
                onTaskCreated?.()
            } else {
                console.error("Failed to create task:", data.error)
            }
        } catch (error) {
            console.error("Failed to create task:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task to your project. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Project */}
                        <div className="grid gap-2">
                            <Label htmlFor="project">Project</Label>
                            <Select
                                value={formData.projectId}
                                onValueChange={(value) =>
                                    setFormData(prev => ({ ...prev, projectId: value }))
                                }
                            >
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, title: e.target.value }))
                                }
                                placeholder="e.g., Fix meta descriptions on product pages"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Add more details about this task..."
                                rows={3}
                            />
                        </div>

                        {/* Status & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) =>
                                        setFormData(prev => ({ ...prev, status: value as TaskStatus }))
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">To Do</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) =>
                                        setFormData(prev => ({ ...prev, priority: value as TaskPriority }))
                                    }
                                >
                                    <SelectTrigger id="priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Estimated Time */}
                        <div className="grid gap-2">
                            <Label htmlFor="estimatedTime">Estimated Time (hours)</Label>
                            <Input
                                id="estimatedTime"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.estimatedTime}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))
                                }
                                placeholder="e.g., 2"
                            />
                        </div>

                        {/* Tags */}
                        <div className="grid gap-2">
                            <Label htmlFor="tags">Tags (comma-separated)</Label>
                            <Input
                                id="tags"
                                value={formData.tags}
                                onChange={(e) =>
                                    setFormData(prev => ({ ...prev, tags: e.target.value }))
                                }
                                placeholder="e.g., meta-tags, product-pages"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
