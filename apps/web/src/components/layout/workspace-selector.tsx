"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2 } from "lucide-react"

import { authClient, useSession } from "@/lib/auth-client"
import { useWorkspaceStore } from "@/stores/use-workspace-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function WorkspaceSelector() {
  const session = useSession()
  const organizations = authClient.useListOrganizations()
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace)
  const fetchProjects = useWorkspaceStore((state) => state.fetchProjects)
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null)

  const organizationList = useMemo(
    () => organizations.data ?? [],
    [organizations.data]
  )
  const activeOrganizationId = session.data?.session.activeOrganizationId ?? ""
  const activeOrganization = organizationList.find(
    (organization) => organization.id === activeOrganizationId
  )

  useEffect(() => {
    setWorkspace(activeOrganization?.id ?? null, activeOrganization?.name ?? "")
    if (activeOrganization?.id) {
      void fetchProjects()
    }
  }, [activeOrganization?.id, activeOrganization?.name, fetchProjects, setWorkspace])

  async function selectWorkspace(organizationId: string) {
    setPendingOrganizationId(organizationId)
    const result = await authClient.organization.setActive({ organizationId })
    setPendingOrganizationId(null)

    if (!result.error) {
      const organization = organizationList.find((item) => item.id === organizationId)
      setWorkspace(organizationId, organization?.name ?? "")
      await fetchProjects()
    }
  }

  return (
    <Select
      value={activeOrganizationId}
      onValueChange={(value) => void selectWorkspace(value)}
      disabled={organizations.isPending || Boolean(pendingOrganizationId)}
    >
      <SelectTrigger className="h-9 w-[145px] sm:w-[220px]">
        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Workspace" />
      </SelectTrigger>
      <SelectContent className="z-dropdown">
        {organizationList.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
