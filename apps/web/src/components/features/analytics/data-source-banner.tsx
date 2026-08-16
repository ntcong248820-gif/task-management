"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Loader2, RefreshCw, XCircle } from "lucide-react"
import {
  useIntegrationStatus,
  type IntegrationHealthState,
} from "@/hooks/use-integrations-settings"

const HEALTH_BADGE: Record<IntegrationHealthState, { label: string; className: string; icon: typeof CheckCircle }> = {
  healthy: { label: "Healthy", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  syncing: { label: "Syncing", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Loader2 },
  stale: { label: "Stale", className: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  needs_reconnect: { label: "Needs reconnect", className: "bg-orange-50 text-orange-700 border-orange-200", icon: RefreshCw },
  error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
}

function HealthBadge({ state }: { state: IntegrationHealthState }) {
  const config = HEALTH_BADGE[state]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`gap-1 font-normal ${config.className}`}>
      <Icon className={`h-3 w-3 ${state === "syncing" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  )
}

interface DataSourceBannerProps {
  projectId: string
}

export function DataSourceBanner({ projectId }: DataSourceBannerProps) {
  const { status, loading } = useIntegrationStatus(projectId)

  if (loading || !status) return null

  const sources = [
    status.gsc.connected && status.gsc.isActive
      ? { key: "gsc", label: "GSC", resource: status.gsc.siteUrl, integration: status.gsc }
      : null,
    status.ga4.connected && status.ga4.isActive
      ? { key: "ga4", label: "GA4", resource: status.ga4.propertyName || status.ga4.propertyId, integration: status.ga4 }
      : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null)

  if (sources.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border bg-gray-50 px-4 py-2 text-sm">
      {sources.map(({ key, label, resource, integration }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-gray-600">
            {label}: <span className="font-medium text-gray-900">{resource || "Not selected"}</span>
          </span>
          {integration.healthState && <HealthBadge state={integration.healthState} />}
          {integration.lastSync && (
            <span className="text-xs text-gray-500">
              Synced {new Date(integration.lastSync).toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
