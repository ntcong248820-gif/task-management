"use client"

import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import type { Project } from "@/types/task.types"

interface TaskFiltersProps {
    /** Current search query */
    searchQuery: string;
    /** Current selected project ID (or 'all') */
    selectedProject: string;
    /** Current selected status (or 'all') */
    selectedStatus: string;
    /** Available projects */
    projects: Project[];
    /** Callback when search query changes */
    onSearchChange: (query: string) => void;
    /** Callback when project filter changes */
    onProjectChange: (projectId: string) => void;
    /** Callback when status filter changes */
    onStatusChange: (status: string) => void;
}

export function TaskFilters({
    searchQuery,
    selectedProject,
    selectedStatus,
    projects,
    onSearchChange,
    onProjectChange,
    onStatusChange,
}: TaskFiltersProps) {
    return (
        <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Project Filter */}
            <Select value={selectedProject} onValueChange={onProjectChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
