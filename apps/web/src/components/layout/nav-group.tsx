"use client"

import { useEffect, useState } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { NavItem } from "@/components/layout/nav-item"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface NavGroupItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroupProps {
  label: string
  items: NavGroupItem[]
  pathname: string
  defaultOpen?: boolean
  onNavigate?: () => void
}

export function NavGroup({
  label,
  items,
  pathname,
  defaultOpen,
  onNavigate,
}: NavGroupProps) {
  const hasActiveItem = items.some((item) => isActivePath(pathname, item.href))
  const [open, setOpen] = useState(defaultOpen || hasActiveItem)

  useEffect(() => {
    if (hasActiveItem) setOpen(true)
  }, [hasActiveItem])

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-1">
      <CollapsibleTrigger className="flex min-h-9 w-full items-center justify-between rounded-md px-3 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        <span>{label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActivePath(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
