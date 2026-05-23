'use client';

import type { Task } from '@/types/task.types';

interface WorkloadChartProps {
  tasks: Task[];
  sprintName?: string;
}

interface AssigneeLoad {
  id: string;
  taskCount: number;
  estimatedMinutes: number;
}

function aggregateByAssignee(tasks: Task[]): AssigneeLoad[] {
  const map = new Map<string, AssigneeLoad>();

  for (const task of tasks) {
    const key = task.assigneeId ?? 'unassigned';
    const existing = map.get(key);
    if (existing) {
      existing.taskCount++;
      existing.estimatedMinutes += task.estimatedTime ?? 0;
    } else {
      map.set(key, { id: key, taskCount: 1, estimatedMinutes: task.estimatedTime ?? 0 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.estimatedMinutes - a.estimatedMinutes);
}

function shortId(id: string): string {
  if (id === 'unassigned') return 'Unassigned';
  // Use last 8 chars for brevity since we don't have display names here
  return id.length > 12 ? `…${id.slice(-8)}` : id;
}

export function WorkloadChart({ tasks, sprintName }: WorkloadChartProps) {
  const rows = aggregateByAssignee(tasks);
  if (!rows.length) return null;

  const maxMinutes = Math.max(...rows.map((r) => r.estimatedMinutes), 1);

  return (
    <div className="space-y-3">
      {sprintName && (
        <p className="text-xs text-muted-foreground">Sprint: {sprintName}</p>
      )}
      {rows.map((row) => {
        const pct = Math.round((row.estimatedMinutes / maxMinutes) * 100);
        const hours = Math.round(row.estimatedMinutes / 60);
        return (
          <div key={row.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[160px]">{shortId(row.id)}</span>
              <span className="text-muted-foreground shrink-0">
                {row.taskCount} task{row.taskCount !== 1 ? 's' : ''}
                {hours > 0 ? `, ${hours}h` : ''}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
