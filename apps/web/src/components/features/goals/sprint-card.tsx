'use client';

import Link from 'next/link';
import { CalendarDays, CheckCircle2, ListTodo, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { startSprint, completeSprint, deleteSprint } from '@/hooks/use-sprints';
import type { Sprint, SprintStatus } from '@/types/goal.types';

interface SprintCardProps {
  sprint: Sprint;
  tasksTotal?: number;
  tasksDone?: number;
  onMutate: () => void;
}

const STATUS_VARIANT: Record<SprintStatus, 'default' | 'secondary' | 'outline'> = {
  planning: 'outline',
  active: 'default',
  completed: 'secondary',
};

export function SprintCard({ sprint, tasksTotal = 0, tasksDone = 0, onMutate }: SprintCardProps) {
  async function handleStart() {
    try {
      await startSprint(sprint.id);
      onMutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start sprint');
    }
  }

  async function handleComplete() {
    try {
      await completeSprint(sprint.id);
      onMutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete sprint');
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete sprint "${sprint.name}"?`)) return;
    try {
      await deleteSprint(sprint.id);
      onMutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete sprint');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{sprint.name}</span>
          <Badge variant={STATUS_VARIANT[sprint.status]} className="shrink-0 text-xs capitalize">
            {sprint.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{sprint.startDate} → {sprint.endDate}</span>
        </div>

        <div className="text-xs text-muted-foreground">
          {tasksDone}/{tasksTotal} tasks done
        </div>

        {sprint.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{sprint.description}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Link href={`/dashboard/tasks?view=board&sprintId=${sprint.id}`}>
                <ListTodo className="h-3.5 w-3.5" />
                Tasks
              </Link>
            </Button>
            {sprint.status === 'planning' && (
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleStart}>
                <Play className="h-3.5 w-3.5" />
                Start
              </Button>
            )}
            {sprint.status === 'active' && (
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleComplete}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
