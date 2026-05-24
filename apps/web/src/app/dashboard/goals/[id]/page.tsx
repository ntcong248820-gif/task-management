'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { SprintCard } from '@/components/features/goals/sprint-card';
import { SprintCreateDialog } from '@/components/features/goals/sprint-create-dialog';
import { WorkloadChart } from '@/components/features/goals/workload-chart';
import { useGoal } from '@/hooks/use-goals';
import { useSprintTasks } from '@/hooks/use-sprints';
import type { Sprint } from '@/types/goal.types';

interface Props {
  params: Promise<{ id: string }>;
}

function SprintTasksWorkload({ sprint, onMutate }: { sprint: Sprint; onMutate: () => void }) {
  const { tasks } = useSprintTasks(sprint.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  return (
    <SprintCard
      sprint={sprint}
      tasksTotal={tasks.length}
      tasksDone={done}
      onMutate={onMutate}
    />
  );
}

export default function GoalDetailPage({ params }: Props) {
  const { id } = use(params);
  const { goal, loading, mutate } = useGoal(id);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);

  // Aggregate all sprint tasks for workload chart
  const activeSprint = goal?.sprints?.find((s) => s.status === 'active') ?? null;
  const { tasks: activeSprintTasks } = useSprintTasks(activeSprint?.id ?? null);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Loading goal..."
          description="Preparing goal details and linked sprints."
        />
        <div className="p-4 sm:p-6 space-y-6">
          <LoadingSkeleton className="h-4 w-20" />
          <LoadingSkeleton className="h-32 w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingSkeleton className="h-36 w-full" />
            <LoadingSkeleton className="h-36 w-full" />
            <LoadingSkeleton className="h-36 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Goal not found.</div>
    );
  }

  const tasksTotal = goal.tasksTotal ?? 0;
  const tasksDone = goal.tasksDone ?? 0;
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={goal.title}
        description={goal.description ?? undefined}
        actions={
          <Button size="sm" onClick={() => setCreateSprintOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create sprint
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Back link */}
        <Link href="/dashboard/goals" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          All goals
        </Link>

        {/* Goal header summary */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">{goal.type}</Badge>
            <Badge variant={goal.status === 'active' ? 'default' : 'secondary'} className="capitalize">{goal.status}</Badge>
            <span className="text-xs text-muted-foreground">{goal.startDate} → {goal.endDate}</span>
          </div>

          {goal.targetMetric && (
            <p className="text-sm text-muted-foreground">
              Target: <strong>{goal.targetValue}</strong> {goal.targetMetric}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{tasksDone}/{tasksTotal} tasks done</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Team workload for active sprint */}
        {activeSprint && activeSprintTasks.length > 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Team Workload</h3>
            <WorkloadChart tasks={activeSprintTasks} sprintName={activeSprint.name} />
          </div>
        )}

        {/* Sprints section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Sprints <span className="font-normal text-muted-foreground">({goal.sprints?.length ?? 0})</span>
          </h3>

          {!goal.sprints?.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No sprints yet. Create one to break this goal into milestones.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {goal.sprints.map((sprint) => (
                <SprintTasksWorkload key={sprint.id} sprint={sprint} onMutate={mutate} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SprintCreateDialog
        open={createSprintOpen}
        goalId={id}
        projectId={goal.projectId}
        onClose={() => setCreateSprintOpen(false)}
        onCreated={() => mutate()}
      />
    </div>
  );
}
