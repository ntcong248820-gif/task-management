"use client"

import { useEffect, useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from '@/components/KanbanColumn';
import { TaskCard } from '@/components/TaskCard';
import { TaskDialog } from '@/components/TaskDialog';
import { KanbanBoardSkeleton } from '@/components/KanbanBoardSkeleton';
import { getApiUrl } from '@/lib/config';
import type { Task, TaskStatus } from '@/types/task.types';

interface KanbanBoardProps {
    /** Optional project ID to filter tasks */
    projectId?: number;
    /** Search query to filter tasks by title/description */
    searchQuery?: string;
    /** Selected project filter ('all' or project ID) */
    selectedProject?: string;
    /** Selected status filter ('all' or status) */
    selectedStatus?: string;
}

export function KanbanBoard({
    projectId,
    searchQuery = '',
    selectedProject = 'all',
    selectedStatus = 'all'
}: KanbanBoardProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Fetch tasks from API
    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const fetchTasks = async () => {
        try {
            setIsLoading(true);
            const url = projectId
                ? getApiUrl(`/api/tasks?projectId=${projectId}`)
                : getApiUrl('/api/tasks');

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setTasks(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as number;

        // Determine the new status
        // If over.id is a string (column status), use it directly
        // If over.id is a number (task ID), find which column that task belongs to
        let newStatus: TaskStatus;

        if (typeof over.id === 'string') {
            // Dropped directly on column
            newStatus = over.id as TaskStatus;
        } else {
            // Dropped on another task - find which column it's in
            const targetTask = tasks.find((t) => t.id === over.id);
            if (!targetTask) return;
            newStatus = targetTask.status;
        }

        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic update
        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === taskId ? { ...t, status: newStatus } : t
            )
        );

        // Update via API
        try {
            const response = await fetch(getApiUrl(`/api/tasks/${taskId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    ...(newStatus === 'done' && { completedAt: new Date().toISOString() }),
                }),
            });

            const data = await response.json();

            if (!data.success) {
                // Revert on error
                setTasks((prevTasks) =>
                    prevTasks.map((t) =>
                        t.id === taskId ? { ...t, status: task.status } : t
                    )
                );
                console.error('Failed to update task status');
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            // Revert on error
            setTasks((prevTasks) =>
                prevTasks.map((t) =>
                    t.id === taskId ? { ...t, status: task.status } : t
                )
            );
        }
    };


    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(getApiUrl(`/api/tasks/${taskId}`), {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
            } else {
                console.error('Failed to delete task');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsEditDialogOpen(true);
    };

    const handleStartTimer = (task: Task) => {
        // Timer is handled by useTimerStore in TaskCard
        console.log('Start timer for task:', task);
    };

    const handleEditSuccess = () => {
        fetchTasks(); // Refresh tasks after edit
    };

    // Filter tasks based on search and filters
    const getFilteredTasks = () => {
        return tasks.filter((task) => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

            // Project filter
            const matchesProject = selectedProject === 'all' ||
                task.projectId.toString() === selectedProject;

            // Status filter (applied at column level, not here)

            return matchesSearch && matchesProject;
        });
    };

    const getTasksByStatus = (status: TaskStatus) => {
        const filteredTasks = getFilteredTasks();

        // Apply status filter
        if (selectedStatus !== 'all' && selectedStatus !== status) {
            return [];
        }

        return filteredTasks.filter((task) => task.status === status);
    };

    if (isLoading) {
        return <KanbanBoardSkeleton />;
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
                <KanbanColumn
                    status="todo"
                    title="To Do"
                    tasks={getTasksByStatus('todo')}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onStartTimer={handleStartTimer}
                />
                <KanbanColumn
                    status="in_progress"
                    title="In Progress"
                    tasks={getTasksByStatus('in_progress')}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onStartTimer={handleStartTimer}
                />
                <KanbanColumn
                    status="done"
                    title="Done"
                    tasks={getTasksByStatus('done')}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onStartTimer={handleStartTimer}
                />
            </div>

            <DragOverlay>
                {activeTask ? (
                    <TaskCard task={activeTask} />
                ) : null}
            </DragOverlay>

            {/* Edit Task Dialog */}
            {editingTask && (
                <TaskDialog
                    mode="edit"
                    task={editingTask}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSuccess={handleEditSuccess}
                />
            )}
        </DndContext>
    );
}
