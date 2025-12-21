export type TaskType = 'Technical' | 'Content' | 'Backlink';
export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  impact: 'High' | 'Medium' | 'Low';
  status: TaskStatus | 'Completed';
  assignee?: string;
  dueDate?: string;
  spentTime: number; // Total time spent in seconds
  isRunning: boolean; // Is the timer currently active?
  date?: string; // YYYY-MM-DD
  progress?: number; // 0-100 for progress bar
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  healthScore: number;
  openTasks: number;
  status: 'Active' | 'Paused';
  trend: 'up' | 'down' | 'stable';
}

export interface DailyMetric {
  date: string;
  displayDate: string;
  clicks: number;
  impressions: number;
  position: number;
  ahrefsTraffic?: number; // Added for Layer Control
  drScore?: number; // Added for Layer Control
  tasks?: Task[]; 
}

export interface GA4Metric {
  date: string;
  displayDate: string;
  sessions: number;
  users: number;
  newUsers: number;
  engagementRate: number;
  conversions: number;
  revenue: number;
}

export interface TrafficSource {
  source: string;
  users: number;
  sessions: number;
  engagementRate: number;
  conversions: number;
  revenue: number;
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  change: number;
  volume: number;
  url: string;
  updatedAt: string;
}

export interface BacklinkData {
  domain: string;
  dr: number;
  type: 'DoFollow' | 'NoFollow';
  anchor: string;
  date: string;
}

export interface CompetitorData {
  domain: string;
  dr: number;
  traffic: number;
  keywords: number;
  overlap: number;
}

export interface KPIData {
  label: string;
  value: string;
  trend: number;
  isPositive: boolean;
  subtext: string;
}