import { KeyRound } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function SettingsIntegrationsPage() {
  return (
    <div>
      <PageHeader title="Integrations" description="GSC and GA4 connection shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={KeyRound}
          title="Integration settings"
          description="Connection controls will appear here."
        />
      </div>
    </div>
  )
}
