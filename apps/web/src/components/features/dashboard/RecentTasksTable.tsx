'use client';

import { Link2, FileText, Wrench } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ListTodo } from 'lucide-react';

interface RecentTask {
    id: number;
    title: string;
    type: string;
    date: string;
    impact: number;
}

interface RecentTasksTableProps {
    tasks: RecentTask[];
}

function TaskTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'backlink':
            return <Link2 className="w-4 h-4 text-purple-500" />;
        case 'content':
            return <FileText className="w-4 h-4 text-blue-500" />;
        default:
            return <Wrench className="w-4 h-4 text-orange-500" />;
    }
}

export function RecentTasksTable({ tasks }: RecentTasksTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent High-Impact Tasks</CardTitle>
                <CardDescription>Tasks completed in this period with estimated impact</CardDescription>
            </CardHeader>
            <CardContent>
                {tasks.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead className="text-muted-foreground bg-muted/50 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Task Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Completed</th>
                                <th className="px-4 py-3 text-right">Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{task.title}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <TaskTypeIcon type={task.type} />
                                            <span className="capitalize">{task.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{task.date}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-bold">+{task.impact}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No completed tasks in this period</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
