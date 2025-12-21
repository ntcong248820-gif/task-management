import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  ListTodo, 
  BarChart3, 
  Settings, 
  Bell, 
  Search,
  ArrowUpRight,
  MousePointer2,
  Eye,
  Crosshair,
  Clock,
  Hammer,
  FileText,
  Link as LinkIcon,
  Sparkles,
  MoreVertical,
  Activity,
  Users,
  DollarSign,
  PieChart,
  Globe,
  Plus,
  Filter,
  Play,
  Pause,
  Timer,
  Target,
  Trophy,
  Layers,
  X,
  ChevronRight,
  Download
} from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Scatter,
  ReferenceArea,
  Legend
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  generatePerformanceData, 
  generateProjects, 
  generateInitialTasks, 
  generateGA4Data,
  generateRankings,
  generateBacklinks,
  generateCompetitors,
  formatNumber, 
  formatCurrency,
  formatDuration,
  cn 
} from '../lib/utils';
import { DailyMetric, Task, TaskStatus, TaskType } from '../types';

// --- Shared Components ---

const NavItem = ({ icon: Icon, label, id, activeTab, onClick }: { icon: any, label: string, id: string, activeTab: string, onClick: (id: string) => void }) => (
  <button 
    onClick={() => onClick(id)}
    className={cn(
      "flex items-center w-full gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
      activeTab === id
        ? "bg-slate-800 text-white" 
        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
    )}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const KPICard = ({ title, value, icon: Icon, trend, subtext, colorClass = "text-slate-500" }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <Icon className={cn("h-4 w-4", colorClass)} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="flex items-center text-xs">
          {trend && (
            <span className={cn("font-medium flex items-center", trend > 0 ? "text-emerald-600" : "text-red-500")}>
              <ArrowUpRight className={cn("h-3 w-3 mr-1", trend < 0 && "rotate-180")} />
              {Math.abs(trend)}%
            </span>
          )}
          <span className="text-slate-500 ml-2">{subtext}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Sub-View Components ---

const ProjectsView = () => {
  const projects = useMemo(() => generateProjects(), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Danh sách Dự án</h2>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Thêm dự án
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">{project.name}</CardTitle>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {project.domain}
                </p>
              </div>
              <Badge variant={project.status === 'Active' ? 'content' : 'secondary'}>
                {project.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Health Score</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xl font-bold",
                      project.healthScore >= 90 ? "text-emerald-600" : 
                      project.healthScore >= 70 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {project.healthScore}
                    </span>
                    <Activity className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Tác vụ mở</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-700">{project.openTasks}</span>
                    <ListTodo className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const RankingsView = () => {
  const rankings = useMemo(() => generateRankings(), []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Keyword Rankings (Ahrefs)</h2>
          <p className="text-slate-500">Theo dõi thứ hạng từ khóa real-time.</p>
        </div>
        <div className="text-xs text-slate-400">Last updated: 2 hours ago</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title="Top 3 Keywords" value="12" icon={Trophy} trend={8} subtext="keywords" colorClass="text-yellow-500" />
        <KPICard title="Top 10 Keywords" value="46" icon={Target} trend={12} subtext="keywords" colorClass="text-blue-500" />
        <KPICard title="Est. Traffic" value="3.2K" icon={MousePointer2} trend={-2} subtext="visits/mo" colorClass="text-emerald-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Movers This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Keyword</th>
                <th className="px-6 py-3 text-center">Position</th>
                <th className="px-6 py-3 text-center">Change</th>
                <th className="px-6 py-3 text-right">Volume</th>
                <th className="px-6 py-3 text-right">Est. Traffic</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, i) => (
                <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{row.keyword}</td>
                  <td className="px-6 py-4 text-center font-bold">{row.position}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={row.change > 0 ? "content" : "destructive"} className="px-2">
                      {row.change > 0 ? `+${row.change} 🔥` : `${row.change} 📉`}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">{formatNumber(row.volume)}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatNumber(Math.floor(row.volume * 0.3))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

const BacklinksView = () => {
  const links = useMemo(() => generateBacklinks(), []);
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backlinks Monitor</h2>
          <p className="text-slate-500">Theo dõi hồ sơ liên kết và chất lượng domain.</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title="Referring Domains" value="3,456" icon={Globe} trend={45} subtext="new this month" />
        <KPICard title="Domain Rating (DR)" value="68" icon={Activity} trend={2} subtext="+2 vs last month" colorClass="text-purple-500" />
        <KPICard title="Lost Links" value="3" icon={LinkIcon} trend={-12} subtext="last 7 days" colorClass="text-red-500" />
      </div>

      <Card>
        <CardHeader><CardTitle>New Backlinks This Week</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {links.map((link, i) => (
              <div key={i} className="flex items-start justify-between p-4 border rounded-lg bg-slate-50/50 hover:bg-white transition-shadow hover:shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700">{link.domain}</span>
                    <Badge variant="outline" className="text-[10px] h-5">DR {link.dr}</Badge>
                    <Badge variant={link.type === 'DoFollow' ? 'content' : 'secondary'} className="text-[10px] h-5">{link.type}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">Anchor: <span className="font-medium">"{link.anchor}"</span></p>
                </div>
                <div className="text-xs text-slate-400 font-medium">{link.date}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CompetitorsView = () => {
  const comps = useMemo(() => generateCompetitors(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Competitor Analysis</h2>
      
      <Card>
        <CardHeader><CardTitle>Competitive Metrics</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Domain</th>
                <th className="px-6 py-3 text-center">DR</th>
                <th className="px-6 py-3 text-right">Traffic</th>
                <th className="px-6 py-3 text-right">Keywords</th>
                <th className="px-6 py-3 text-right">Overlap</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((comp, i) => (
                <tr key={i} className={cn("border-b", i === 0 ? "bg-emerald-50/50 border-l-4 border-l-emerald-500" : "")}>
                  <td className="px-6 py-4 font-bold flex items-center gap-2">
                    {comp.domain} {i === 0 && <Badge className="bg-emerald-600">YOU</Badge>}
                  </td>
                  <td className="px-6 py-4 text-center">{comp.dr}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(comp.traffic)}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(comp.keywords)}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{comp.overlap > 0 ? formatNumber(comp.overlap) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="bg-slate-900 text-white border-none">
            <CardHeader><CardTitle className="text-white">Content Gap Opportunities</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/10 rounded border border-white/10">
                <div className="font-bold text-yellow-400 mb-1">"gaming laptop under 1500"</div>
                <div className="text-sm text-slate-300">Competitor 1 ranks #2. You don't rank. <br/>Volume: 8,100</div>
              </div>
               <div className="p-3 bg-white/10 rounded border border-white/10">
                <div className="font-bold text-yellow-400 mb-1">"asus rog laptop review"</div>
                <div className="text-sm text-slate-300">Competitor 2 ranks #4. You don't rank. <br/>Volume: 6,500</div>
              </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

const TasksView = ({ tasks, onToggleTimer, onAddTask }: { tasks: Task[], onToggleTimer: (id: string) => void, onAddTask: (task: Partial<Task>) => void }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<{title: string, type: TaskType, impact: 'High'|'Medium'|'Low'}>({
    title: '',
    type: 'Technical',
    impact: 'Medium'
  });

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'Backlog', label: 'Cần làm', color: 'bg-slate-100' },
    { id: 'In Progress', label: 'Đang thực hiện', color: 'bg-blue-50' },
    { id: 'Review', label: 'Chờ duyệt', color: 'bg-yellow-50' },
    { id: 'Done', label: 'Hoàn thành', color: 'bg-emerald-50' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    onAddTask({
      ...newTask,
      status: 'Backlog',
      spentTime: 0,
      isRunning: false,
      date: new Date().toISOString().split('T')[0],
      progress: 0
    });
    setNewTask({ title: '', type: 'Technical', impact: 'Medium' });
    setShowAddModal(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col relative">
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Thêm tác vụ mới</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên tác vụ</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Ví dụ: Tối ưu thẻ H1..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value as TaskType})}
                  >
                    <option value="Technical">Technical</option>
                    <option value="Content">Content</option>
                    <option value="Backlink">Backlink</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ tác động</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={newTask.impact}
                    onChange={(e) => setNewTask({...newTask, impact: e.target.value as any})}
                  >
                    <option value="High">Cao</option>
                    <option value="Medium">Trung bình</option>
                    <option value="Low">Thấp</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="mr-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md">Tạo tác vụ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý Công việc</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Tác vụ mới
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-[1000px]">
          {columns.map(col => (
            <div key={col.id} className="flex-1 flex flex-col min-w-[250px] bg-slate-50/50 rounded-xl border border-slate-200">
              <div className={cn("p-4 border-b border-slate-200 rounded-t-xl font-semibold flex justify-between items-center", col.color)}>
                {col.label}
                <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full border border-black/5">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {tasks.filter(t => t.status === col.id).map(task => (
                  <Card key={task.id} className={cn(
                    "cursor-move hover:shadow-md transition-all group border-l-4 relative bg-white",
                    task.isRunning ? "border-l-emerald-500 ring-2 ring-emerald-500/20" : "border-l-transparent"
                  )}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <Badge variant={task.type === 'Technical' ? 'technical' : task.type === 'Content' ? 'content' : 'backlink'}>
                          {task.type}
                        </Badge>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                      <p className="font-medium text-sm leading-snug">{task.title}</p>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                         <div className="flex items-center gap-1">
                          <span className={cn("w-2 h-2 rounded-full", task.impact === 'High' ? "bg-red-500" : task.impact === 'Medium' ? "bg-yellow-500" : "bg-blue-500")}/>
                          {task.impact}
                        </div>
                         {task.assignee && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{task.assignee}</span>}
                      </div>

                      {/* Progress Bar & Timer */}
                      <div className="space-y-2 mt-2">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-900 h-full rounded-full" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        <div className={cn("flex items-center justify-between p-2 rounded-md transition-colors", task.isRunning ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-600")}>
                          <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                            <Clock className={cn("w-3.5 h-3.5", task.isRunning && "animate-pulse text-emerald-600")} />
                            {formatDuration(task.spentTime)}
                          </div>
                          <button onClick={() => onToggleTimer(task.id)} className={cn("p-1.5 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95", task.isRunning ? "bg-red-100 text-red-600" : "bg-white text-slate-900")}>
                            {task.isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AnalyticsView = () => {
  const [source, setSource] = useState<'gsc' | 'ga4'>('ga4'); 
  const ga4Data = useMemo(() => generateGA4Data(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Phân tích chuyên sâu</h2>
          <p className="text-slate-500">Báo cáo đa kênh tích hợp Google Search Console & Google Analytics 4.</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button onClick={() => setSource('gsc')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", source === 'gsc' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-900")}>Search Console</button>
          <button onClick={() => setSource('ga4')} className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2", source === 'ga4' ? "bg-white shadow text-orange-600" : "text-slate-500 hover:text-slate-900")}>
            <PieChart className="w-4 h-4" /> Google Analytics 4
          </button>
        </div>
      </div>

      {source === 'ga4' ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard title="Users" value={formatNumber(ga4Data.daily.reduce((a, b) => a + b.users, 0))} icon={Users} trend={8.2} subtext="Total users" colorClass="text-blue-500" />
            <KPICard title="Sessions" value={formatNumber(ga4Data.daily.reduce((a, b) => a + b.sessions, 0))} icon={Activity} trend={12.5} subtext="Total sessions" colorClass="text-purple-500" />
            <KPICard title="Engagement" value="58.4%" icon={PieChart} trend={-2.1} subtext="Avg. rate" colorClass="text-orange-500" />
            <KPICard title="Revenue" value={formatCurrency(ga4Data.daily.reduce((a, b) => a + b.revenue, 0))} icon={DollarSign} trend={15.3} subtext="Est. revenue" colorClass="text-emerald-500" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader><CardTitle>Xu hướng truy cập & Chuyển đổi</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ga4Data.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} stroke="#10b981" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                    <Bar yAxisId="left" dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sessions" />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ga4Data.sources.map((src, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{src.source}</span>
                        <span className="text-slate-500">{formatNumber(src.users)} users</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-orange-400" : "bg-emerald-400")} style={{ width: `${(src.users / 25620) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border border-slate-200">
          <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Search Console View</h3>
        </div>
      )}
    </div>
  );
};

const SettingsView = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="border-b border-slate-200 pb-4"><h2 className="text-2xl font-bold">Cài đặt hệ thống</h2></div>
    <Card>
      <CardHeader><CardTitle>Kết nối dữ liệu</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><BarChart3 className="w-6 h-6 text-slate-600" /></div>
            <div><p className="font-medium">Google Search Console</p><p className="text-xs text-slate-500">shop-coffee.com</p></div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Connected</Badge>
        </div>
      </CardContent>
    </Card>
  </div>
);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: DailyMetric = payload[0].payload;
    const hasTasks = data.tasks && data.tasks.length > 0;
    return (
      <div className="bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 min-w-[250px] z-50">
        <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, i: number) => (
             <div key={i} className="flex justify-between items-center text-xs">
                <span style={{ color: entry.color }}>{entry.name}</span>
                <span className="font-bold">{formatNumber(entry.value)}</span>
             </div>
          ))}
        </div>
        {hasTasks && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1"><Hammer className="w-3 h-3" />Tasks Done:</p>
            <ul className="space-y-1">
              {data.tasks!.map((task, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />{task.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState<number>(30); 
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('seo-impact-tasks');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Error parsing tasks', e); }
    return generateInitialTasks(90);
  });
  const [performanceData, setPerformanceData] = useState<DailyMetric[]>(() => generatePerformanceData(30));
  
  // Chart Layer State
  const [layers, setLayers] = useState({
    clicks: true,
    ahrefs: false,
    dr: false,
    impact: true
  });

  useEffect(() => { setPerformanceData(generatePerformanceData(dateRange)); }, [dateRange]);
  useEffect(() => { localStorage.setItem('seo-impact-tasks', JSON.stringify(tasks)); }, [tasks]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (tasks.some(t => t.isRunning)) {
      interval = setInterval(() => {
        setTasks(prev => prev.map(t => t.isRunning ? { ...t, spentTime: t.spentTime + 1 } : t));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tasks]);

  const handleToggleTimer = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isRunning: !t.isRunning } : t));
  };

  const handleAddTask = (taskPartial: Partial<Task>) => {
    const newTask: Task = {
      id: `new-${Date.now()}`,
      title: taskPartial.title || 'New Task',
      type: taskPartial.type || 'Technical',
      impact: taskPartial.impact || 'Medium',
      status: 'Backlog',
      spentTime: 0,
      isRunning: false,
      date: new Date().toISOString().split('T')[0],
      progress: 0,
      ...taskPartial
    } as Task;
    setTasks(prev => [newTask, ...prev]);
  };

  const chartData = useMemo(() => performanceData.map(day => ({ ...day, tasks: tasks.filter(t => t.date === day.date) })), [performanceData, tasks]);
  
  // Find active task for Sidebar Widget
  const activeTask = tasks.find(t => t.isRunning);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Correlation Dashboard</h1><p className="text-slate-500 mt-1">Chứng minh tác động của SEO Tasks lên Traffic.</p></div>
              <div className="flex items-center gap-2">
                <select value={dateRange} onChange={(e) => setDateRange(Number(e.target.value))} className="text-sm border border-slate-300 px-3 py-1.5 rounded-md">
                  <option value={7}>7 ngày qua</option>
                  <option value={30}>30 ngày qua</option>
                  <option value={90}>90 ngày qua</option>
                </select>
                <button className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard title="Traffic Growth" value="+45%" icon={MousePointer2} trend={45} subtext="vs prev period" colorClass="text-blue-500" />
              <KPICard title="Tasks Completed" value={String(tasks.filter(t=>t.status==='Done').length)} icon={ListTodo} subtext="this period" />
              <KPICard title="Avg. Impact" value="+15%" icon={Target} trend={15} subtext="per task" colorClass="text-emerald-500" />
              <KPICard title="Domain Rating" value="68" icon={Activity} trend={2} subtext="+2 points" colorClass="text-purple-500" />
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2">Correlation Chart</CardTitle>
                     {/* Layer Controls */}
                     <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3"/> Layers:</span>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={layers.clicks} onChange={()=>setLayers(p=>({...p, clicks:!p.clicks}))} className="rounded text-blue-600"/> GSC Clicks</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={layers.ahrefs} onChange={()=>setLayers(p=>({...p, ahrefs:!p.ahrefs}))} className="rounded text-purple-600"/> Ahrefs Traffic</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={layers.dr} onChange={()=>setLayers(p=>({...p, dr:!p.dr}))} className="rounded text-orange-600"/> DR Score</label>
                     </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} interval={dateRange > 30 ? 4 : 0} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Impact Windows (Shaded Areas for Tasks) */}
                        {layers.impact && chartData.map((day, i) => {
                           if (day.tasks && day.tasks.length > 0) {
                             // Create a window of 3 days for visual
                             const endIndex = Math.min(i + 3, chartData.length - 1);
                             return <ReferenceArea key={i} yAxisId="left" x1={day.displayDate} x2={chartData[endIndex].displayDate} fill="#10b981" fillOpacity={0.15} />
                           }
                           return null;
                        })}

                        {layers.clicks && <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="GSC Clicks" />}
                        {layers.ahrefs && <Line yAxisId="left" type="monotone" dataKey="ahrefsTraffic" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Ahrefs Traffic" />}
                        {layers.dr && <Line yAxisId="right" type="step" dataKey="drScore" stroke="#f97316" strokeWidth={2} dot={false} name="DR Score" />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Recent High Impact Tasks */}
            <Card>
               <CardHeader><CardTitle>Recent High-Impact Tasks</CardTitle></CardHeader>
               <CardContent>
                  <table className="w-full text-sm text-left">
                     <thead className="text-slate-500 bg-slate-50 uppercase text-xs">
                        <tr><th className="px-4 py-3">Task Name</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3 text-right">Impact</th></tr>
                     </thead>
                     <tbody>
                        {tasks.filter(t=>t.status==='Done').slice(0,3).map((t,i) => (
                           <tr key={i} className="border-b"><td className="px-4 py-3 font-medium">{t.title}</td><td className="px-4 py-3 text-slate-500">{t.date}</td><td className="px-4 py-3 text-right text-emerald-600 font-bold">+{(Math.random()*15 + 5).toFixed(1)}%</td></tr>
                        ))}
                     </tbody>
                  </table>
               </CardContent>
            </Card>
          </div>
        );
      case 'projects': return <ProjectsView />;
      case 'tasks': return <TasksView tasks={tasks} onToggleTimer={handleToggleTimer} onAddTask={handleAddTask} />;
      case 'analytics': return <AnalyticsView />;
      case 'rankings': return <RankingsView />;
      case 'backlinks': return <BacklinksView />;
      case 'competitors': return <CompetitorsView />;
      case 'settings': return <SettingsView />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
             SEO Impact OS
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Home" id="dashboard" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={ListTodo} label="Tasks" id="tasks" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={BarChart3} label="Analytics" id="analytics" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={Target} label="Rankings" id="rankings" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={LinkIcon} label="Backlinks" id="backlinks" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={Trophy} label="Competitors" id="competitors" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={Briefcase} label="Projects" id="projects" activeTab={activeTab} onClick={setActiveTab} />
          <NavItem icon={Settings} label="Settings" id="settings" activeTab={activeTab} onClick={setActiveTab} />
        </nav>
        
        {/* Active Timer Widget in Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
           {activeTask ? (
             <div className="bg-slate-800 rounded-lg p-3 border border-emerald-500/30 animate-pulse-slow">
                <div className="flex items-center gap-2 text-emerald-400 mb-2 font-bold text-xs uppercase tracking-wider">
                   <Clock className="w-3 h-3" /> Active Timer
                </div>
                <div className="text-2xl font-mono font-bold mb-1">{formatDuration(activeTask.spentTime)}</div>
                <div className="text-xs text-slate-400 truncate mb-2">{activeTask.title}</div>
                <button onClick={() => handleToggleTimer(activeTask.id)} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 rounded flex items-center justify-center gap-1">
                   <Pause className="w-3 h-3" /> Stop
                </button>
             </div>
           ) : (
             <div className="bg-slate-800 rounded-lg p-3 opacity-50">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">No Active Timer</div>
                <div className="text-xl font-mono text-slate-600">00:00:00</div>
             </div>
           )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">PT</div>
            <div><p className="text-sm font-medium">Peter Truong</p><p className="text-[10px] text-slate-400">Pro Plan</p></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Project</span><ChevronRight className="w-4 h-4" /><span className="font-bold text-slate-900">Tiki.vn</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-9 h-9 w-64 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button className="relative p-2 text-slate-500 hover:text-slate-700"><Bell className="w-5 h-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span></button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}