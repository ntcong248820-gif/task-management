"use client"

import { useState } from "react"
import { Loader2, Trash2, UserCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { WorkspaceMember, WorkspaceRole } from "@/hooks/use-team-settings"

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

const ROLE_BADGE_CLASS: Record<WorkspaceRole, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-green-100 text-green-800 border-green-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
}

const ASSIGNABLE_ROLES: WorkspaceRole[] = ["admin", "member", "viewer"]

interface TeamMemberRowProps {
  member: WorkspaceMember
  isCurrentUser: boolean
  canManageRoles: boolean
  isOwner: boolean
  ownerCount: number
  isUpdating: boolean
  isRemoving: boolean
  onUpdateRole: (memberId: string, role: WorkspaceRole) => Promise<boolean>
  onRemove: (memberId: string) => Promise<boolean>
}

export function TeamMemberRow({
  member,
  isCurrentUser,
  canManageRoles,
  isOwner,
  ownerCount,
  isUpdating,
  isRemoving,
  onUpdateRole,
  onRemove,
}: TeamMemberRowProps) {
  const [confirmRemove, setConfirmRemove] = useState(false)

  const isLastOwner = member.role === "owner" && ownerCount <= 1
  const canChangeRole =
    canManageRoles &&
    !isCurrentUser &&
    !(member.role === "owner" && !isOwner)
  const canRemove =
    canManageRoles &&
    !isCurrentUser &&
    !isLastOwner &&
    !(member.role === "owner" && !isOwner)

  const initials = member.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleRemoveConfirmed() {
    setConfirmRemove(false)
    await onRemove(member.id)
  }

  return (
    <>
      <div className="flex items-center gap-3 py-3 px-1">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {member.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.user.image}
              alt={member.user.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : initials ? (
            initials
          ) : (
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {member.user.name}
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {canChangeRole ? (
            <Select
              value={member.role}
              onValueChange={(val) => onUpdateRole(member.id, val as WorkspaceRole)}
              disabled={isUpdating || isRemoving}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role} className="text-xs">
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
                {member.role === "owner" && (
                  <SelectItem value="owner" className="text-xs">
                    Owner
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Badge
              variant="outline"
              className={`text-xs ${ROLE_BADGE_CLASS[member.role]}`}
            >
              {ROLE_LABELS[member.role]}
            </Badge>
          )}

          {canRemove ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={isRemoving || isUpdating}
              onClick={() => setConfirmRemove(true)}
            >
              {isRemoving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium">{member.user.name}</span> from this
              workspace? They will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirmed}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
