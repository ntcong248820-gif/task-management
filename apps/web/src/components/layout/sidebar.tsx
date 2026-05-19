"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Flag,
  FolderKanban,
  Goal,
  Home,
  KeyRound,
  LineChart,
  ListTodo,
  Search,
  Sparkles,
  Users,
} from "lucide-react"

import { NavGroup, type NavGroupItem } from "@/components/layout/nav-group"
import { NavItem } from "@/components/layout/nav-item"

const analyticsItems: NavGroupItem[] = [
  { href: "/dashboard/analytics", label: "Overview", icon: LineChart },
  { href: "/dashboard/analytics/keywords", label: "Keywords", icon: Search },
  { href: "/dashboard/analytics/pages", label: "Pages", icon: BarChart3 },
  { href: "/dashboard/analytics/alerts", label: "Alerts", icon: AlertTriangle },
]

const settingsItems: NavGroupItem[] = [
  { href: "/dashboard/settings/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/settings/team", label: "Team", icon: Users },
  { href: "/dashboard/settings/integrations", label: "Integrations", icon: KeyRound },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="truncate text-base font-semibold">SEO Impact OS</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <NavItem
            href="/dashboard"
            label="Overview"
            icon={Home}
            active={pathname === "/dashboard"}
            onNavigate={onNavigate}
          />
          <NavItem
            href="/dashboard/tasks"
            label="Tasks"
            icon={ListTodo}
            active={pathname === "/dashboard/tasks"}
            onNavigate={onNavigate}
          />
          <NavItem
            href="/dashboard/goals"
            label="Goals"
            icon={Goal}
            active={pathname === "/dashboard/goals"}
            onNavigate={onNavigate}
          />
          <NavItem
            href="/dashboard/sprints"
            label="Sprints"
            icon={CalendarDays}
            active={pathname === "/dashboard/sprints"}
            onNavigate={onNavigate}
          />
        </div>
        <NavGroup
          label="Analytics"
          items={analyticsItems}
          pathname={pathname}
          defaultOpen
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Settings"
          items={settingsItems}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Flag className="h-3.5 w-3.5" />
          <span>Internal MVP</span>
        </div>
      </div>
    </aside>
  )
}
