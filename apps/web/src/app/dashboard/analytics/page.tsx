import { LineChart } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Cross-source analytics overview shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={LineChart}
          title="Analytics overview"
          description="Traffic, engagement, and correlation summaries will appear here."
        />
      </div>
    </div>
  )
}
