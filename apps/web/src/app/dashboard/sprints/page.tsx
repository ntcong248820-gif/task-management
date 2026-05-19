import { CalendarDays } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function SprintsPage() {
  return (
    <div>
      <PageHeader title="Sprints" description="Campaign periods and sprint planning shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={CalendarDays}
          title="No sprints yet"
          description="Sprint planning will appear here."
        />
      </div>
    </div>
  )
}
