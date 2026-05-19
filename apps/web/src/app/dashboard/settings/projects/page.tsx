import { FolderKanban } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"

export default function SettingsProjectsPage() {
  return (
    <div>
      <PageHeader title="Projects" description="Workspace project settings shell." />
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={FolderKanban}
          title="Project settings"
          description="Project management controls will appear here."
        />
      </div>
    </div>
  )
}
