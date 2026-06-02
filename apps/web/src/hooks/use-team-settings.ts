"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import { authClient, useSession } from "@/lib/auth-client"

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer"

export interface WorkspaceMember {
  id: string
  userId: string
  organizationId: string
  role: WorkspaceRole
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

async function fetchMembers(organizationId: string): Promise<WorkspaceMember[]> {
  const result = await authClient.organization.listMembers({ query: { organizationId } })
  if (result.error) throw new Error(result.error.message ?? "Failed to fetch members")
  // listMembers returns { members: WorkspaceMember[], total: number } — extract the array
  const raw = result.data as unknown as { members: WorkspaceMember[] } | WorkspaceMember[] | null
  if (!raw) return []
  return (Array.isArray(raw) ? raw : raw.members) as WorkspaceMember[]
}

export function useTeamSettings() {
  const session = useSession()
  const activeOrganizationId = session.data?.session.activeOrganizationId ?? null

  const swrKey = activeOrganizationId ? ["team-members", activeOrganizationId] : null
  const { data, error: fetchError, isLoading, mutate } = useSWR<WorkspaceMember[]>(
    swrKey,
    ([, orgId]) => fetchMembers(orgId as string),
    { revalidateOnFocus: false }
  )

  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const members: WorkspaceMember[] = data ?? []
  const currentUserId = session.data?.user.id
  const currentMember = members.find((m) => m.userId === currentUserId)
  const currentRole = currentMember?.role
  const canManageRoles = currentRole === "owner" || currentRole === "admin"
  const isOwner = currentRole === "owner"
  const ownerCount = members.filter((m) => m.role === "owner").length

  const updateMemberRole = useCallback(
    async (memberId: string, role: WorkspaceRole): Promise<boolean> => {
      setMutationError(null)
      setUpdatingMemberId(memberId)
      try {
        const result = await authClient.organization.updateMemberRole({ memberId, role })
        if (result.error) {
          setMutationError(result.error.message ?? "Failed to update role")
          return false
        }
        await mutate()
        return true
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to update role")
        return false
      } finally {
        setUpdatingMemberId(null)
      }
    },
    [mutate]
  )

  const removeMember = useCallback(
    async (memberIdOrEmail: string): Promise<boolean> => {
      setMutationError(null)
      setRemovingMemberId(memberIdOrEmail)
      try {
        const result = await authClient.organization.removeMember({ memberIdOrEmail })
        if (result.error) {
          setMutationError(result.error.message ?? "Failed to remove member")
          return false
        }
        await mutate()
        return true
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to remove member")
        return false
      } finally {
        setRemovingMemberId(null)
      }
    },
    [mutate]
  )

  return {
    members,
    loading: isLoading || session.isPending,
    error: fetchError?.message ?? mutationError ?? null,
    currentUserId,
    currentRole,
    canManageRoles,
    isOwner,
    ownerCount,
    updatingMemberId,
    removingMemberId,
    updateMemberRole,
    removeMember,
    refetch: mutate,
  }
}
