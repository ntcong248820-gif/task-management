'use client';

import Link from 'next/link';
import { CalendarDays, Target, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Goal, GoalStatus } from '@/types/goal.types';

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
}

const STATUS_VARIANT: Record<GoalStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
};

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{done}/{total} tasks done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function isOverdue(goal: Goal): boolean {
  return goal.status === 'active' && goal.endDate < new Date().toISOString().slice(0, 10);
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const overdue = isOverdue(goal);
  const tasksTotal = goal.tasksTotal ?? 0;
  const tasksDone = goal.tasksDone ?? 0;

  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Link
              href={`/dashboard/goals/${goal.id}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              {goal.title}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={overdue ? 'destructive' : STATUS_VARIANT[goal.status]} className="text-xs">
              {overdue ? 'overdue' : goal.status}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">{goal.type}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <ProgressBar done={tasksDone} total={tasksTotal} />

        {goal.targetMetric && goal.targetValue && (
          <p className="text-xs text-muted-foreground">
            Target: {goal.targetValue} {goal.targetMetric}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {goal.startDate} → {goal.endDate}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link href={`/dashboard/goals/${goal.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              View sprints
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
