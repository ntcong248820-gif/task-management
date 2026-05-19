"use client"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"

interface SidebarTriggerProps {
  onClick: () => void
}

export function SidebarTrigger({ onClick }: SidebarTriggerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
