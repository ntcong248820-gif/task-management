import { auth } from "@repo/auth-config"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "./dashboard-shell"

export const runtime = "nodejs"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login?redirect=/dashboard")
  }

  if (!session.session.activeOrganizationId) {
    redirect("/workspace")
  }

  return <DashboardShell>{children}</DashboardShell>
}
