"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"

import { AlertCard } from "@/components/features/alerts/alert-card"
import { AlertFilters, type AlertFilterState } from "@/components/features/alerts/alert-filters"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { useAlerts, markAllAlertsRead } from "@/hooks/use-alerts"

export default function AnalyticsAlertsPage() {
  const [filters, setFilters] = useState<AlertFilterState>({
    severity: "",
    type: "",
    status: "",
    unreadOnly: false,
  })

  const { alerts, loading, mutate } = useAlerts({
    severity: filters.severity || undefined,
    type: filters.type || undefined,
    status: filters.status || undefined,
    unreadOnly: filters.unreadOnly || undefined,
  })

  const unreadCount = alerts.filter((a) => !a.isRead).length

  const handleMarkAllRead = async () => {
    await markAllAlertsRead()
    await mutate()
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Anomaly alerts, content decay warnings, and SEO recommendations."
      />
      <div className="space-y-4 p-4 sm:p-6">
        <AlertFilters
          filters={filters}
          onChange={setFilters}
          onMarkAllRead={() => void handleMarkAllRead()}
          unreadCount={unreadCount}
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={filters.unreadOnly ? "No unread alerts" : "No active alerts"}
            description={
              filters.unreadOnly
                ? "All alerts have been read."
                : "Traffic anomalies, content decay warnings, and recommendations appear here. Alert engine activates after 4 weeks of GSC history."
            }
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMutate={() => void mutate()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
