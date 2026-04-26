"use client"

import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { ErrorBoundary } from "@/components/error-boundary"

import { DateProvider } from "@/contexts/DateContext"
import { ProjectProvider } from "@/contexts/ProjectContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <ProjectProvider>
        <DateProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Header */}
              <Header />

              {/* Page Content */}
              <main className="flex-1 overflow-y-auto bg-background p-6">
                {children}
              </main>
            </div>
          </div>
        </DateProvider>
      </ProjectProvider>
    </ErrorBoundary>
  )
}
