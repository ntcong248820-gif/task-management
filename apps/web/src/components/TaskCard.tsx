"use client"

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, Edit, Play, Square } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';
import { formatTime } from '@/lib/formatTime';
import type { Task } from '@/types/task.types';

interface TaskCardProps {
    task: Task;
    onDelete?: (taskId: number) => void;
    onEdit?: (task: Task) => void;
    onStartTimer?: (task: Task) => void;
}

export function TaskCard({ task, onDelete, onEdit, onStartTimer }: TaskCardProps) {
    const { activeTask, isRunning, startTimer } = useTimerStore();
    const isActiveTimer = activeTask?.id === task.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Card className="cursor-move hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                            {task.title}
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className={`${getPriorityColor(task.priority)} text-xs shrink-0`}
                        >
                            {task.priority}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                        </p>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Time tracking */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                            {formatTime(task.timeSpent)}
                            {task.estimatedTime && ` / ${formatTime(task.estimatedTime)}`}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-2">
                        <Button
                            size="sm"
                            variant={isActiveTimer && isRunning ? "default" : "ghost"}
                            className={`h-7 px-2 ${isActiveTimer && isRunning ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isActiveTimer && isRunning) {
                                    return;
                                }
                                startTimer(task);
                                onStartTimer?.(task);
                            }}
                            disabled={activeTask !== null && activeTask.id !== task.id}
                        >
                            {isActiveTimer && isRunning ? (
                                <>
                                    <Square className="h-3 w-3 mr-1 fill-current" />
                                    Active
                                </>
                            ) : (
                                <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Start
                                </>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(task);
                            }}
                        >
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(task.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
