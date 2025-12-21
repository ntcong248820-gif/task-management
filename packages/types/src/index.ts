// Shared TypeScript types across the monorepo

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskType = 'technical' | 'content' | 'links';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: number;
  name: string;
  client?: string;
  domain?: string;
  status: 'active' | 'archived';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  taskType?: TaskType;
  priority: TaskPriority;
  assignedTo?: string;
  timeSpent: number; // seconds
  estimatedTime?: number; // seconds
  completedAt?: Date;
  expectedImpactStart?: string; // date string
  expectedImpactEnd?: string; // date string
  actualImpact?: Record<string, any>;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLog {
  id: number;
  taskId: number;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  notes?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
