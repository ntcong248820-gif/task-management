"use client"

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { Inbox } from 'lucide-react';
import type { Task, TaskStatus } from '@/types/task.types';

interface KanbanColumnProps {
    status: TaskStatus;
    title: string;
    tasks: Task[];
    onDeleteTask?: (taskId: number) => void;
    onEditTask?: (task: Task) => void;
    onStartTimer?: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-slate-100 text-slate-800 border-slate-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    done: 'bg-green-100 text-green-800 border-green-200',
};

export function KanbanColumn({
    status,
    title,
    tasks,
    onDeleteTask,
    onEditTask,
    onStartTimer,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{title}</h3>
                <Badge variant="outline" className={statusColors[status]}>
                    {tasks.length}
                </Badge>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 rounded-lg border-2 border-dashed p-4 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}
            >
                <SortableContext
                    items={tasks.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="No tasks"
                                description={`No tasks in ${title.toLowerCase()} yet`}
                            />
                        ) : (
                            tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onDelete={onDeleteTask}
                                    onEdit={onEditTask}
                                    onStartTimer={onStartTimer}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}
