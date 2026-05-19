import { Users } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function SettingsTeamPage() {
  return (
    <div>
      <PageHeader title="Team" description="Workspace member settings shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Users}
          title="Team settings"
          description="Member and role controls will appear here."
        />
      </div>
    </div>
  )
}
