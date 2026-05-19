import { AlertTriangle } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function AnalyticsAlertsPage() {
  return (
    <div>
      <PageHeader title="Alerts" description="Workspace alert inbox shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={AlertTriangle}
          title="No active alerts"
          description="Traffic and ranking alerts will appear here."
        />
      </div>
    </div>
  )
}
