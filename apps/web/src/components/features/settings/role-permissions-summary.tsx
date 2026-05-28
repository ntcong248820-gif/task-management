import { Check, Minus } from "lucide-react"

interface RolePermission {
  label: string
  owner: boolean
  admin: boolean
  member: boolean
  viewer: boolean
}

const PERMISSIONS: RolePermission[] = [
  { label: "View members & projects", owner: true, admin: true, member: true, viewer: true },
  { label: "Create & update tasks", owner: true, admin: true, member: true, viewer: false },
  { label: "Create & update projects", owner: true, admin: true, member: true, viewer: false },
  { label: "Manage members & roles", owner: true, admin: true, member: false, viewer: false },
  { label: "Manage workspace settings", owner: true, admin: true, member: false, viewer: false },
  { label: "Delete workspace", owner: true, admin: false, member: false, viewer: false },
]

const ROLES = ["owner", "admin", "member", "viewer"] as const

const ROLE_COLORS: Record<string, string> = {
  owner: "text-purple-700",
  admin: "text-blue-700",
  member: "text-green-700",
  viewer: "text-gray-600",
}

export function RolePermissionsSummary() {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Permission</th>
            {ROLES.map((role) => (
              <th
                key={role}
                className={`px-3 py-2.5 text-center font-medium capitalize ${ROLE_COLORS[role]}`}
              >
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSIONS.map((perm, idx) => (
            <tr
              key={perm.label}
              className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              <td className="px-4 py-2 text-muted-foreground">{perm.label}</td>
              {ROLES.map((role) => (
                <td key={role} className="px-3 py-2 text-center">
                  {perm[role] ? (
                    <Check className="mx-auto h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Minus className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
