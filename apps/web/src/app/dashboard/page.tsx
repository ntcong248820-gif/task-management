import {
  AlertTriangle,
  CheckCircle2,
  LineChart,
  ListTodo,
  Target,
  Timer,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

const overviewCards = [
  { title: "Active Alerts", value: "0", detail: "No unread alerts", icon: AlertTriangle },
  { title: "Tasks This Week", value: "0", detail: "Ready for task views", icon: CheckCircle2 },
  { title: "Tracked Time", value: "0h", detail: "No active timer", icon: Timer },
  { title: "Goals", value: "0", detail: "No active goals", icon: Target },
]

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Workspace snapshot for alerts, work, and SEO momentum."
      />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{card.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <EmptyState
            icon={LineChart}
            title="Traffic trend"
            description="Analytics snapshots will appear here once intelligence views are connected."
          />
          <EmptyState
            icon={ListTodo}
            title="Recent work"
            description="Recent workspace activity will appear here."
          />
        </div>
      </div>
    </div>
  )
}
