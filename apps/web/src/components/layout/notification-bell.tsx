"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Bell } from "lucide-react"

import { useAlertStore } from "@/stores/use-alert-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
}

export function NotificationBell() {
  const unreadCount = useAlertStore((s) => s.unreadCount)
  const alerts = useAlertStore((s) => s.alerts)
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts)
  const markAllRead = useAlertStore((s) => s.markAllRead)

  // Initial fetch + 30s polling
  useEffect(() => {
    void fetchAlerts()
    const interval = setInterval(() => void fetchAlerts(), 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alerts.length > 0 ? (
          alerts.slice(0, 5).map((alert) => (
            <DropdownMenuItem key={alert.id} className="flex items-start gap-2 py-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[alert.severity] ?? "bg-muted"}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{alert.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{alert.body}</p>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No unread alerts
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <Link
            href="/dashboard/analytics/alerts"
            className="text-xs text-primary hover:underline"
          >
            View all alerts →
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
