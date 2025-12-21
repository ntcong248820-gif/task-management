import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DailyMetric, Task, TaskType, Project, GA4Metric, TrafficSource, KeywordRanking, BacklinkData, CompetitorData } from "../types";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- MOCK DATA: Projects ---
export const generateProjects = (): Project[] => [
  { id: '1', name: 'E-commerce Client A', domain: 'shop-coffee.com', healthScore: 92, openTasks: 5, status: 'Active', trend: 'up' },
  { id: '2', name: 'SaaS Platform B', domain: 'tech-solution.io', healthScore: 78, openTasks: 12, status: 'Active', trend: 'down' },
  { id: '3', name: 'Local Business C', domain: 'hanoi-spa.vn', healthScore: 88, openTasks: 3, status: 'Paused', trend: 'stable' },
  { id: '4', name: 'Blog Network D', domain: 'daily-news.net', healthScore: 65, openTasks: 24, status: 'Active', trend: 'down' },
];

// --- MOCK DATA: Tasks ---
export const generateInitialTasks = (days: number = 30): Task[] => {
  const today = new Date();
  const getDateStr = (minusDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - minusDays);
    return d.toISOString().split('T')[0];
  };

  return [
    { id: 'k1', title: 'Nghiên cứu từ khóa bộ "Máy pha cafe"', type: 'Content', impact: 'High', status: 'Backlog', assignee: 'Content Team', spentTime: 0, isRunning: false, date: getDateStr(2), progress: 0 },
    { id: 'k2', title: 'Tối ưu tốc độ tải trang (LCP)', type: 'Technical', impact: 'High', status: 'In Progress', assignee: 'Dev Team', dueDate: 'Today', spentTime: 15432, isRunning: false, date: getDateStr(5), progress: 65 },
    { id: 'k3', title: 'Viết bài Guest Post trên tinhte.vn', type: 'Backlink', impact: 'Medium', status: 'In Progress', assignee: 'Outreach', spentTime: 3600, isRunning: false, date: getDateStr(8), progress: 30 },
    { id: 'k4', title: 'Review cấu trúc H1-H6 landing page', type: 'Content', impact: 'Medium', status: 'Review', assignee: 'SEO Lead', spentTime: 1800, isRunning: false, date: getDateStr(12), progress: 90 },
    { id: 'k5', title: 'Cài đặt Schema FAQ', type: 'Technical', impact: 'Low', status: 'Done', assignee: 'Dev Team', spentTime: 900, isRunning: false, date: getDateStr(15), progress: 100 },
    { id: 'k6', title: 'Disavow 50 domain spam', type: 'Backlink', impact: 'High', status: 'Done', assignee: 'SEO Lead', spentTime: 2400, isRunning: false, date: getDateStr(20), progress: 100 },
    { id: 't1', title: 'Audit Technical (Crawl Errors)', type: 'Technical', impact: 'High', status: 'Done', spentTime: 7200, isRunning: false, date: getDateStr(25), progress: 100 },
    { id: 't3', title: 'Update Content: "Top Coffee Beans"', type: 'Content', impact: 'High', status: 'Done', spentTime: 5400, isRunning: false, date: getDateStr(28), progress: 100 },
  ];
};

// --- MOCK DATA: Performance Metrics (GSC + Ahrefs Mixed) ---
export const generatePerformanceData = (days: number = 30): DailyMetric[] => {
  const data: DailyMetric[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const trendFactor = 1 + ((days - i) / days) * 0.4; 
    let baseClicks = (800 + (Math.random() * 200)) * trendFactor; 
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) baseClicks *= 0.75;
    const baseImpressions = baseClicks * (18 + Math.random() * 8);

    data.push({
      date: d.toISOString().split('T')[0],
      displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
      clicks: Math.floor(baseClicks),
      impressions: Math.floor(baseImpressions),
      position: parseFloat((14 - ((days-i) * 0.1) + (Math.random() * 0.5)).toFixed(1)),
      ahrefsTraffic: Math.floor(baseClicks * 0.8), // Ahrefs usually underestimates
      drScore: 65 + Math.floor((days - i) / 10), // Gradual DR increase
      tasks: [] 
    });
  }
  return data;
};

// --- MOCK DATA: GA4 ---
export const generateGA4Data = (days: number = 30): { daily: GA4Metric[], sources: TrafficSource[] } => {
  // ... existing code ...
   const daily: GA4Metric[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    const baseSessions = 1500 + (Math.random() * 500);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    daily.push({
      date: d.toISOString().split('T')[0],
      displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
      sessions: Math.floor(isWeekend ? baseSessions * 0.8 : baseSessions),
      users: Math.floor(isWeekend ? baseSessions * 0.7 : baseSessions * 0.85),
      newUsers: Math.floor(baseSessions * 0.6),
      engagementRate: parseFloat((55 + Math.random() * 10).toFixed(2)), 
      conversions: Math.floor(baseSessions * 0.03), 
      revenue: Math.floor(baseSessions * 0.03 * 500000) 
    });
  }

  const sources: TrafficSource[] = [
    { source: 'Organic Search', users: 15420, sessions: 18500, engagementRate: 62.5, conversions: 450, revenue: 225000000 },
    { source: 'Direct', users: 5200, sessions: 8100, engagementRate: 58.2, conversions: 120, revenue: 60000000 },
    { source: 'Organic Social', users: 3100, sessions: 3800, engagementRate: 45.0, conversions: 50, revenue: 25000000 },
    { source: 'Referral', users: 1200, sessions: 1500, engagementRate: 70.1, conversions: 80, revenue: 40000000 },
    { source: 'Email', users: 800, sessions: 1200, engagementRate: 68.5, conversions: 90, revenue: 45000000 },
  ];

  return { daily, sources };
};

// --- MOCK DATA: Ahrefs Rankings ---
export const generateRankings = (): KeywordRanking[] => [
  { keyword: 'gaming laptop 2024', position: 3, change: 7, volume: 12000, url: '/best-gaming-laptops', updatedAt: '2h ago' },
  { keyword: 'best gaming laptop', position: 5, change: 5, volume: 18000, url: '/best-gaming-laptops', updatedAt: '2h ago' },
  { keyword: 'rtx 4070 laptop', position: 8, change: 4, volume: 8500, url: '/rtx-4070-review', updatedAt: '5h ago' },
  { keyword: 'gaming laptop under 1000', position: 12, change: -2, volume: 6200, url: '/budget-gaming', updatedAt: '1d ago' },
  { keyword: 'asus rog review', position: 4, change: 1, volume: 3400, url: '/asus-rog-review', updatedAt: '1d ago' },
  { keyword: 'gaming pc vs laptop', position: 15, change: -3, volume: 9200, url: '/pc-vs-laptop', updatedAt: '2d ago' },
];

// --- MOCK DATA: Backlinks ---
export const generateBacklinks = (): BacklinkData[] => [
  { domain: 'techradar.com', dr: 92, type: 'DoFollow', anchor: 'best gaming laptops', date: 'Dec 10' },
  { domain: 'pcgamer.com', dr: 88, type: 'DoFollow', anchor: 'gaming laptop review', date: 'Dec 9' },
  { domain: 'tomsguide.com', dr: 85, type: 'DoFollow', anchor: 'RTX laptops', date: 'Dec 8' },
  { domain: 'medium.com', dr: 94, type: 'NoFollow', anchor: 'click here', date: 'Dec 5' },
  { domain: 'tinhte.vn', dr: 78, type: 'DoFollow', anchor: 'máy tính chơi game', date: 'Dec 2' },
];

// --- MOCK DATA: Competitors ---
export const generateCompetitors = (): CompetitorData[] => [
  { domain: 'gearvn.com', dr: 68, traffic: 89234, keywords: 13789, overlap: 0 },
  { domain: 'hacom.vn', dr: 72, traffic: 95678, keywords: 15234, overlap: 3456 },
  { domain: 'anphatpc.com.vn', dr: 65, traffic: 78901, keywords: 11456, overlap: 2890 },
  { domain: 'phongvu.vn', dr: 81, traffic: 150432, keywords: 22654, overlap: 4100 },
];

export const generateMockData = generatePerformanceData;
export const generateKanbanTasks = () => generateInitialTasks(30);