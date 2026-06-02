"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Loader2, LogOut } from "lucide-react"
import { useIntegrationStatus, useIntegrationMutations } from "@/hooks/use-integrations-settings"

interface IntegrationCardProps {
  provider: "gsc" | "ga4"
  projectId: string | null
  onResourceSelect?: (resourceId: string) => void
  selectedResource?: string
}

export function IntegrationCard({
  provider,
  projectId,
  onResourceSelect,
  selectedResource,
}: IntegrationCardProps) {
  const { status, mutate } = useIntegrationStatus(projectId)
  const mutations = useIntegrationMutations()
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedDays, setSelectedDays] = useState(30)
  const [resourceList, setResourceList] = useState<any[]>([])
  const [showResourcePicker, setShowResourcePicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const providerName = provider === "gsc" ? "Google Search Console" : "Google Analytics 4"
  const isConnected = provider === "gsc" ? status?.gsc.connected : status?.ga4.connected
  const integration = provider === "gsc" ? status?.gsc : status?.ga4

  const handleAuthorize = async () => {
    if (!projectId) {
      setError("Please select a project first")
      return
    }

    setError(null)
    setIsAuthorizing(true)
    try {
      const { authUrl } = await mutations.authorize(provider, projectId)
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authorize")
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleDiscoverAndSync = async () => {
    if (!projectId) return

    setError(null)
    try {
      const result = await mutations.discoverResources(provider, projectId)
      const resources = provider === "gsc" ? result.sites : result.properties
      setResourceList(resources || [])
      setShowResourcePicker(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discover resources")
    }
  }

  const handleSelectAndSync = async (resourceId: string) => {
    if (!projectId) return

    setError(null)
    setSuccessMsg(null)
    setIsSyncing(true)
    try {
      const result = await mutations.sync(provider, projectId, resourceId, selectedDays)
      setSuccessMsg(`Synced ${result.rowsSynced} rows (${result.dateRange.start} to ${result.dateRange.end})`)
      onResourceSelect?.(resourceId)
      setShowResourcePicker(false)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync data")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!projectId) return

    setError(null)
    try {
      await mutations.disconnect(provider, projectId)
      setSuccessMsg(`${providerName} has been disconnected`)
      setShowResourcePicker(false)
      setResourceList([])
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {provider === "gsc" ? "🔍" : "📊"} {providerName}
        </CardTitle>
        <CardDescription>Connect and manage {providerName} data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {!isConnected ? (
          <Button onClick={handleAuthorize} disabled={!projectId || isAuthorizing} className="w-full">
            {isAuthorizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              `Connect ${providerName}`
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Connected</p>
                <p className="text-xs text-gray-600">{integration?.accountEmail}</p>
              </div>
            </div>

            {provider === "gsc" && selectedResource && (
              <div className="text-sm">
                <p className="text-gray-600">Site: <span className="font-medium">{selectedResource}</span></p>
              </div>
            )}

            {provider === "ga4" && selectedResource && (
              <div className="text-sm">
                <p className="text-gray-600">Property: <span className="font-medium">{selectedResource}</span></p>
              </div>
            )}

            {integration?.syncStatus === "syncing" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </div>
            )}

            {integration?.lastSync && integration?.syncStatus !== "syncing" && (
              <p className="text-xs text-gray-600">
                Last sync: {new Date(integration.lastSync).toLocaleDateString()}
              </p>
            )}

            {integration?.syncError && (
              <div className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{integration.syncError}</p>
              </div>
            )}

            <div className="space-y-2 border-t pt-3">
              {!showResourcePicker ? (
                <div className="space-y-2">
                  <Button
                    onClick={handleDiscoverAndSync}
                    variant="outline"
                    className="w-full"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      `Discover ${provider === "gsc" ? "Sites" : "Properties"}`
                    )}
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    Select {provider === "gsc" ? "Site" : "Property"}:
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-2">
                    {resourceList.length === 0 ? (
                      <p className="text-xs text-gray-600">No resources found</p>
                    ) : (
                      resourceList.map((resource: any) => {
                        const resourceId = provider === "gsc" ? resource.siteUrl : resource.propertyId
                        const resourceName = provider === "gsc" ? resource.siteUrl : resource.propertyName || resource.propertyId
                        return (
                          <button
                            key={resourceId}
                            onClick={() => handleSelectAndSync(resourceId)}
                            disabled={isSyncing}
                            className="text-left w-full p-2 rounded hover:bg-gray-100 text-sm"
                          >
                            <p className="font-medium">{resourceName}</p>
                            {resource.permissionLevel && (
                              <p className="text-xs text-gray-600">{resource.permissionLevel}</p>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    <label className="text-sm font-medium">Date Range (days)</label>
                    <select
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(Number(e.target.value))}
                      className="w-full rounded border px-2 py-1 text-sm"
                      disabled={isSyncing}
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={180}>Last 180 days</option>
                      <option value={365}>Last year</option>
                    </select>
                  </div>

                  <Button
                    onClick={() => setShowResourcePicker(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isSyncing}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
