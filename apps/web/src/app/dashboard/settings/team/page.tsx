"use client"

import { useState } from "react"
import { AlertCircle, ChevronDown, ChevronUp, Mail, Users } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { TeamMemberRow } from "@/components/features/settings/team-member-row"
import { RolePermissionsSummary } from "@/components/features/settings/role-permissions-summary"
import { useTeamSettings } from "@/hooks/use-team-settings"

export default function SettingsTeamPage() {
  const {
    members,
    loading,
    error,
    currentUserId,
    canManageRoles,
    isOwner,
    ownerCount,
    updatingMemberId,
    removingMemberId,
    updateMemberRole,
    removeMember,
  } = useTeamSettings()

  const [showPermissions, setShowPermissions] = useState(false)

  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage workspace members and their roles."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Members list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Members
                  {members.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {members.length}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {canManageRoles
                    ? "You can update roles for admin, member, and viewer accounts."
                    : "Contact an owner or admin to change your role."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3 py-2">
                <LoadingSkeleton className="h-10 w-full" />
                <LoadingSkeleton className="h-10 w-full" />
                <LoadingSkeleton className="h-10 w-full" />
              </div>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No members found.
              </p>
            ) : (
              <div className="divide-y">
                {members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    isCurrentUser={member.userId === currentUserId}
                    canManageRoles={canManageRoles}
                    isOwner={isOwner}
                    ownerCount={ownerCount}
                    isUpdating={updatingMemberId === member.id}
                    isRemoving={removingMemberId === member.id}
                    onUpdateRole={updateMemberRole}
                    onRemove={removeMember}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite — deferred */}
        <Card className="border-dashed opacity-70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <Mail className="h-4 w-4" />
              Invite members
            </CardTitle>
            <CardDescription className="text-xs">
              Email invitations are not available yet — an email provider must be
              configured first. To add teammates now, ask them to sign up and join
              the workspace directly.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Role permissions reference */}
        <div>
          <button
            className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowPermissions((v) => !v)}
          >
            {showPermissions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Role permissions reference
          </button>
          {showPermissions && <RolePermissionsSummary />}
        </div>
      </div>
    </div>
  )
}
