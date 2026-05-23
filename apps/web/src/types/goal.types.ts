export type GoalType = 'traffic' | 'ranking' | 'conversion' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Goal {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string | null;
  type: GoalType;
  targetMetric?: string | null;
  targetValue?: string | null;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  // Inline progress from list endpoint
  tasksTotal?: number;
  tasksDone?: number;
}

export interface GoalWithDetail extends Goal {
  sprints: Sprint[];
}

export interface Sprint {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  goalId?: string | null;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  tasksTotal: number;
  tasksDone: number;
}
