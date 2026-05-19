import { Files } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function AnalyticsPagesPage() {
  return (
    <div>
      <PageHeader title="Pages" description="URL performance shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Files}
          title="No page data loaded"
          description="URL performance trends will appear here."
        />
      </div>
    </div>
  )
}
