"use client"

import { useState } from "react"

import { MobileSidebarSheet } from "@/components/layout/mobile-sidebar-sheet"
import { NotificationBell } from "@/components/layout/notification-bell"
import { ProjectSelector } from "@/components/layout/project-selector"
import { SidebarTrigger } from "@/components/layout/sidebar-trigger"
import { UserMenu } from "@/components/layout/user-menu"
import { WorkspaceSelector } from "@/components/layout/workspace-selector"

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <header className="z-header flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger onClick={() => setMobileNavOpen(true)} />
        <WorkspaceSelector />
        <div className="hidden md:block">
          <ProjectSelector />
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden sm:block md:hidden">
          <ProjectSelector />
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
      <MobileSidebarSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </header>
  )
}
