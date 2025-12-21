export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'technical' | 'content' | 'analysis' | 'other';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  taskType?: TaskType;
  priority: TaskPriority;
  assignedTo?: string;
  timeSpent: number; // in seconds
  estimatedTime?: number; // in seconds
  completedAt?: string;
  expectedImpactStart?: string;
  expectedImpactEnd?: string;
  actualImpact?: Record<string, any>;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  client?: string;
  domain?: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
