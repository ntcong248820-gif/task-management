import { Target } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function GoalsPage() {
  return (
    <div>
      <PageHeader title="Goals" description="Workspace goals and progress shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Goal progress will appear here."
        />
      </div>
    </div>
  )
}
