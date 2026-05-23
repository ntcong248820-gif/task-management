"use client"

import { Toaster } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="z-sidebar hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  )
}
