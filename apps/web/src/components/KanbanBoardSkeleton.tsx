import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function KanbanBoardSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
            {[1, 2, 3].map((col) => (
                <Card key={col} className="flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                            <div className="h-6 w-8 bg-muted animate-pulse rounded-full" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="space-y-3">
                            {[1, 2].map((task) => (
                                <div
                                    key={task}
                                    className="rounded-lg border bg-card p-4 space-y-3"
                                >
                                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                                    <div className="flex gap-2">
                                        <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                                        <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
