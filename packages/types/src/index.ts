// Shared TypeScript types across the monorepo.

export type EntityId = string;

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done';
export type TaskType = 'technical' | 'content' | 'links' | 'planning' | 'meeting' | 'audit';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type GoalType = 'traffic' | 'ranking' | 'conversion' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type SprintStatus = 'planning' | 'active' | 'completed';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type AlertType = 'traffic_drop' | 'ranking_drop' | 'content_decay' | 'anomaly' | 'recommendation';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Project {
  id: EntityId;
  workspaceId: string;
  name: string;
  domain?: string | null;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: EntityId;
  workspaceId: string;
  projectId: EntityId;
  goalId?: EntityId | null;
  sprintId?: EntityId | null;
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
  completedAt?: Date | null;
  expectedImpactStart?: string | null;
  expectedImpactEnd?: string | null;
  actualImpact?: Record<string, unknown> | null;
  isRecurring: boolean;
  recurringTemplateId?: EntityId | null;
  recurringConfig?: Record<string, unknown> | null;
  tags?: string[] | null;
  notes?: string | null;
  targetUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLog {
  id: EntityId;
  taskId: EntityId;
  workspaceId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date | null;
  duration?: number | null;
  note?: string | null;
  createdAt: Date;
}

export interface Goal {
  id: EntityId;
  workspaceId: string;
  projectId: EntityId;
  title: string;
  description?: string | null;
  type: GoalType;
  targetMetric?: string | null;
  targetValue?: string | null;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sprint {
  id: EntityId;
  workspaceId: string;
  projectId?: EntityId | null;
  goalId?: EntityId | null;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConnection {
  id: EntityId;
  projectId: EntityId;
  workspaceId: string;
  authorizedByUserId: string;
  accountEmail?: string | null;
  lastSyncedAt?: Date | null;
  syncStatus: SyncStatus;
  syncError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GSCConnection extends IntegrationConnection {
  siteUrl: string;
  permissionLevel?: string | null;
}

export interface GA4Connection extends IntegrationConnection {
  propertyId: string;
  propertyName?: string | null;
  measurementId?: string | null;
}

export interface Alert {
  id: EntityId;
  workspaceId: string;
  projectId?: EntityId | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AlertRead {
  id: EntityId;
  alertId: EntityId;
  userId: string;
  readAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
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
