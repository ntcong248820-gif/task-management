"use client"

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

export function NotificationBell() {
  const unreadCount = useAlertStore((state) => state.unreadCount)
  const alerts = useAlertStore((state) => state.alerts)
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts)
  const markAllRead = useAlertStore((state) => state.markAllRead)

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Alerts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <DropdownMenuItem key={alert.id} className="flex-col items-start gap-1">
              <span className="font-medium">{alert.title}</span>
              <span className="text-xs text-muted-foreground">{alert.body}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No unread alerts</DropdownMenuItem>
        )}
        {alerts.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={markAllRead}>Mark all read</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
