"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  CheckCircle2,
  ListTodo,
  Minus,
  Target,
  Timer,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { useAlertCount, useLatestDigest } from "@/hooks/use-alerts"

function PctBadge({ pct }: { pct: number }) {
  if (pct > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
      <ArrowUp className="h-3 w-3" />{pct}%
    </span>
  )
  if (pct < 0) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-destructive">
      <ArrowDown className="h-3 w-3" />{Math.abs(pct)}%
    </span>
  )
  return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0%</span>
}

function WeeklyDigestCard() {
  const { digest, loading } = useLatestDigest()

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart2 className="h-4 w-4 text-muted-foreground" /> Weekly SEO Digest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (!digest) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart2 className="h-4 w-4 text-muted-foreground" /> Weekly SEO Digest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Weekly digest will appear here after the first Monday cron run.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { data, weekStart } = digest
  const weekLabel = new Date(weekStart + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart2 className="h-4 w-4 text-muted-foreground" /> Weekly SEO Digest
        </CardTitle>
        <span className="text-xs text-muted-foreground">Week of {weekLabel}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Clicks</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold">{data.weeklyClicks.current.toLocaleString()}</span>
              <PctBadge pct={data.weeklyClicks.pct} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Impressions</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold">{data.weeklyImpressions.current.toLocaleString()}</span>
              <PctBadge pct={data.weeklyImpressions.pct} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tasks done</p>
            <span className="text-lg font-semibold">{data.tasksCompleted}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Alerts</p>
            <span className="text-lg font-semibold">{data.alertsTriggered}</span>
          </div>
        </div>

        {(data.topImprovements.length > 0 || data.topDeclines.length > 0) && (
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            {data.topImprovements.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-green-600">Top improvements</p>
                <ul className="space-y-0.5">
                  {data.topImprovements.map((kw) => (
                    <li key={kw.keyword} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{kw.keyword}</span>
                      <span className="ml-2 shrink-0 font-medium text-green-600">
                        {kw.positionDelta.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.topDeclines.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-destructive">Top declines</p>
                <ul className="space-y-0.5">
                  {data.topDeclines.map((kw) => (
                    <li key={kw.keyword} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">{kw.keyword}</span>
                      <span className="ml-2 shrink-0 font-medium text-destructive">
                        +{kw.positionDelta.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-2">
          <Link
            href="/dashboard/analytics/alerts"
            className="text-xs text-primary hover:underline"
          >
            View all alerts →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertsOverviewCard() {
  const { count, loading } = useAlertCount()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{loading ? "—" : count}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {count > 0 ? (
            <Link href="/dashboard/analytics/alerts" className="text-primary hover:underline">
              View unread alerts →
            </Link>
          ) : "No unread alerts"}
        </p>
      </CardContent>
    </Card>
  )
}

const staticCards = [
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
          <AlertsOverviewCard />
          {staticCards.map((card) => (
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
          <WeeklyDigestCard />
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
