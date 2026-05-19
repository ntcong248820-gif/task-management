"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

interface MobileSidebarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebarSheet({
  open,
  onOpenChange,
}: MobileSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
