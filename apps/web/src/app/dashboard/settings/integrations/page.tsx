"use client"

import { useEffect, useState } from "react"
import { useProjectStore } from "@/stores/use-project-store"
import { PageHeader } from "@/components/ui/page-header"
import { IntegrationCard } from "@/components/features/settings/integration-card"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function SettingsIntegrationsPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get("success")
    const error = params.get("error")

    if (success) {
      const messages: Record<string, string> = {
        gsc_connected: "Google Search Console connected successfully",
        ga4_connected: "Google Analytics 4 connected successfully",
      }
      setMessage({ type: "success", text: messages[success] || "Connected successfully" })
      window.history.replaceState({}, "", "/dashboard/settings/integrations")
    }

    if (error) {
      const messages: Record<string, string> = {
        no_code: "Authorization code missing",
        connection_failed: "Failed to complete connection",
      }
      setMessage({ type: "error", text: messages[error] || error })
      window.history.replaceState({}, "", "/dashboard/settings/integrations")
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect Google Search Console and Google Analytics 4 to sync data."
      />
      <div className="p-4 sm:p-6">
        {message && (
          <div className={`rounded-lg border p-4 flex gap-3 mb-6 ${
            message.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}>
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className={`text-sm ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
              <p className="font-medium">{message.type === "success" ? "Success" : "Error"}</p>
              <p className="text-xs">{message.text}</p>
            </div>
          </div>
        )}

        {!selectedProjectId && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex gap-3 mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Select a project</p>
              <p className="text-xs">Please select a project from the sidebar to manage integrations.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <IntegrationCard provider="gsc" projectId={selectedProjectId} />
          <IntegrationCard provider="ga4" projectId={selectedProjectId} />
        </div>
      </div>
    </div>
  )
}
