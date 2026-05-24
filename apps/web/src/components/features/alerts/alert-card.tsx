"use client"

import { useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp, Info, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { markAlertRead, dismissAlert } from "@/hooks/use-alerts"
import type { Alert } from "@repo/types"

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-destructive", badge: "destructive" as const, dot: "bg-destructive" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", badge: "secondary" as const, dot: "bg-yellow-500" },
  info: { icon: Info, color: "text-blue-500", badge: "outline" as const, dot: "bg-blue-500" },
}

const TYPE_LABELS: Record<string, string> = {
  traffic_drop: "Traffic Drop",
  ranking_drop: "Ranking Drop",
  content_decay: "Content Decay",
  anomaly: "Anomaly",
  recommendation: "Recommendation",
  correlated_drop: "Correlated Drop",
  source_discrepancy: "Source Discrepancy",
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  const diffMin = Math.floor(diffMs / (1000 * 60))
  return diffMin > 0 ? `${diffMin}m ago` : "just now"
}

interface AlertCardProps {
  alert: Alert
  onMutate: () => void
}

export function AlertCard({ alert, onMutate }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
  const SeverityIcon = config.icon

  const handleRead = async () => {
    if (!alert.isRead) {
      await markAlertRead(alert.id)
      onMutate()
    }
  }

  const handleDismiss = async () => {
    await dismissAlert(alert.id)
    onMutate()
  }

  const metadata = alert.metadata as Record<string, unknown> | null

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        !alert.isRead && "border-l-4",
        alert.severity === "critical" && !alert.isRead && "border-l-destructive",
        alert.severity === "warning" && !alert.isRead && "border-l-yellow-500",
        alert.severity === "info" && !alert.isRead && "border-l-blue-500",
        alert.isRead && "opacity-75",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <SeverityIcon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={config.badge} className="text-[10px]">
              {TYPE_LABELS[alert.type] ?? alert.type}
            </Badge>
            {!alert.isRead && (
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-label="unread" />
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelativeTime(alert.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{alert.title}</p>
          <p className={cn("text-xs text-muted-foreground", !expanded && "line-clamp-2")}>
            {alert.body}
          </p>

          {expanded && metadata && (
            <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {typeof metadata.zScore === "number" && (
                <p>Z-score: <span className="font-mono font-medium">{metadata.zScore.toFixed(2)}</span></p>
              )}
              {!!metadata.date && <p>Date: {String(metadata.date)}</p>}
              {typeof metadata.value !== "undefined" && (
                <p>Value: <span className="font-mono">{String(metadata.value)}</span></p>
              )}
              {typeof metadata.mean === "number" && (
                <p>Baseline avg: <span className="font-mono">{(metadata.mean as number).toFixed(1)}</span></p>
              )}
              {!!metadata.pageCount && <p>Pages affected: {String(metadata.pageCount)}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 border-t px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => { void handleRead(); setExpanded((v) => !v) }}
        >
          {expanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
          {expanded ? "Collapse" : "Details"}
        </Button>
        {!alert.isRead && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void handleRead()}>
            Mark read
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => void handleDismiss()}
          aria-label="Dismiss alert"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
