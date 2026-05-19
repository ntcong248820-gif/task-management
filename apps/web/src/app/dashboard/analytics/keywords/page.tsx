import { Search } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function AnalyticsKeywordsPage() {
  return (
    <div>
      <PageHeader title="Keywords" description="Keyword movement shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Search}
          title="No keyword data loaded"
          description="Keyword trends will appear here."
        />
      </div>
    </div>
  )
}
