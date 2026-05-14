export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'technical' | 'content' | 'links' | 'planning' | 'meeting' | 'audit';

export interface Task {
  id: string;
  workspaceId: string;
  projectId: string;
  goalId?: string | null;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  taskType?: TaskType | null;
  priority: TaskPriority;
  affectsWebsite: boolean;
  assigneeId?: string | null;
  reporterId: string;
  timeSpent: number;
  estimatedTime?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  expectedImpactStart?: string | null;
  expectedImpactEnd?: string | null;
  actualImpact?: Record<string, unknown> | null;
  isRecurring: boolean;
  recurringTemplateId?: string | null;
  recurringConfig?: Record<string, unknown> | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  domain?: string | null;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
