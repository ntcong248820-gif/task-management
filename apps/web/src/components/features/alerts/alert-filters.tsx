"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SEVERITIES = [
  { value: "", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
] as const

const TYPES = [
  { value: "", label: "All types" },
  { value: "traffic_drop", label: "Traffic Drop" },
  { value: "ranking_drop", label: "Ranking Drop" },
  { value: "content_decay", label: "Content Decay" },
  { value: "correlated_drop", label: "Correlated Drop" },
  { value: "source_discrepancy", label: "Source Discrepancy" },
  { value: "recommendation", label: "Recommendations" },
  { value: "anomaly", label: "Anomaly" },
] as const

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "dismissed", label: "Dismissed" },
  { value: "task_created", label: "Task created" },
] as const

export interface AlertFilterState {
  severity: string
  type: string
  status: string
  unreadOnly: boolean
}

interface AlertFiltersProps {
  filters: AlertFilterState
  onChange: (filters: AlertFilterState) => void
  onMarkAllRead: () => void
  unreadCount: number
}

export function AlertFilters({ filters, onChange, onMarkAllRead, unreadCount }: AlertFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Severity filter */}
      <div className="flex rounded-md border">
        {SEVERITIES.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange({ ...filters, severity: s.value })}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
              filters.severity === s.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Unread only toggle */}
      <button
        onClick={() => onChange({ ...filters, unreadOnly: !filters.unreadOnly })}
        className={cn(
          "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          filters.unreadOnly
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        Unread only
      </button>

      {/* Type select */}
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="rounded-md border bg-background px-3 py-1.5 text-xs text-foreground"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Status select */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="rounded-md border bg-background px-3 py-1.5 text-xs text-foreground"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Mark all read */}
      {unreadCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 text-xs"
          onClick={onMarkAllRead}
        >
          Mark all read ({unreadCount})
        </Button>
      )}
    </div>
  )
}
