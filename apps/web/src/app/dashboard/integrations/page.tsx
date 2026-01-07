"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, BarChart3, CheckCircle2, XCircle, Loader2, Mail, Clock, RefreshCw } from "lucide-react"
import { getApiUrl } from "@/lib/config"

interface IntegrationData {
    connected: boolean
    lastSync?: string
    scopes?: string[]
    email?: string
}

interface Integration {
    id: string
    name: string
    description: string
    icon: any
    status: "connected" | "disconnected" | "loading"
    provider: string
    data?: IntegrationData
}

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: "gsc",
            name: "Google Search Console",
            description: "Connect to fetch search analytics data (clicks, impressions, CTR, position)",
            icon: Search,
            status: "disconnected",
            provider: "google_search_console",
        },
        {
            id: "ga4",
            name: "Google Analytics 4",
            description: "Connect to fetch analytics data (sessions, users, conversions)",
            icon: BarChart3,
            status: "disconnected",
            provider: "google_analytics",
        },
    ])

    const [connecting, setConnecting] = useState<string | null>(null)
    const [disconnecting, setDisconnecting] = useState<string | null>(null)
    const [syncing, setSyncing] = useState<string | null>(null)
    const [syncResult, setSyncResult] = useState<{ id: string; message: string; success: boolean } | null>(null)

    // Check connection status on mount
    useEffect(() => {
        checkConnectionStatus()
    }, [])

    const checkConnectionStatus = async () => {
        try {
            // Check URL params for OAuth callback
            const params = new URLSearchParams(window.location.search)
            const success = params.get("success")
            const error = params.get("error")

            // Show success/error messages
            if (success === "gsc_connected") {
                console.log("✅ GSC connected successfully!")
                // Could show a toast notification here
            } else if (success === "ga4_connected") {
                console.log("✅ GA4 connected successfully!")
                // Could show a toast notification here
            } else if (error) {
                console.error("❌ OAuth error:", error)
                // Could show error toast here
            }

            // Clear URL params after handling
            if (success || error) {
                window.history.replaceState({}, '', '/dashboard/integrations')
            }

            // Fetch actual connection status from API
            // Get projectId from localStorage or use default
            const projectId = localStorage.getItem('selectedProjectId') || '2'
            const response = await fetch(getApiUrl(`/api/integrations/status?projectId=${projectId}`))
            const data = await response.json()

            if (data.success) {
                // Update GSC status
                if (data.data.gsc.connected) {
                    updateIntegration("gsc", {
                        status: "connected",
                        data: data.data.gsc,
                    })
                }

                // Update GA4 status
                if (data.data.ga4.connected) {
                    updateIntegration("ga4", {
                        status: "connected",
                        data: data.data.ga4,
                    })
                }
            }
        } catch (error) {
            console.error('Failed to check connection status:', error)
        }
    }

    const updateIntegration = (id: string, updates: Partial<Integration>) => {
        setIntegrations((prev) =>
            prev.map((integration) =>
                integration.id === id ? { ...integration, ...updates } : integration
            )
        )
    }

    const handleConnect = async (integration: Integration) => {
        try {
            setConnecting(integration.id)

            const projectId = localStorage.getItem('selectedProjectId') || '2'
            const response = await fetch(
                getApiUrl(`/api/integrations/${integration.id}/authorize?projectId=${projectId}`)
            )
            const data = await response.json()

            if (data.success && data.data.authUrl) {
                window.location.href = data.data.authUrl
            } else {
                throw new Error(data.error || "Failed to get authorization URL")
            }
        } catch (error) {
            console.error(`Failed to connect ${integration.name}:`, error)
            alert(`Failed to connect ${integration.name}. Check console for details.`)
            setConnecting(null)
        }
    }

    const handleDisconnect = async (integration: Integration) => {
        if (!confirm(`Disconnect ${integration.name}? This will remove all stored tokens.`)) return

        try {
            setDisconnecting(integration.id)

            const projectId = localStorage.getItem('selectedProjectId') || '2'
            const response = await fetch(
                getApiUrl(`/api/integrations/${integration.id}/disconnect?projectId=${projectId}`),
                { method: 'DELETE' }
            )
            const data = await response.json()

            if (data.success) {
                updateIntegration(integration.id, {
                    status: "disconnected",
                    data: undefined,
                })
            } else {
                throw new Error(data.error || "Failed to disconnect")
            }
        } catch (error) {
            console.error(`Failed to disconnect ${integration.name}:`, error)
            alert(`Failed to disconnect ${integration.name}. Check console for details.`)
        } finally {
            setDisconnecting(null)
        }
    }

    const handleSync = async (integration: Integration) => {
        try {
            setSyncing(integration.id)
            setSyncResult(null)

            const projectId = localStorage.getItem('selectedProjectId') || '2'

            if (integration.id === 'gsc') {
                // First, discover available sites
                const sitesResponse = await fetch(
                    getApiUrl(`/api/integrations/gsc/sites?projectId=${projectId}&save=true`)
                )
                const sitesData = await sitesResponse.json()

                if (!sitesData.success || !sitesData.data.sites?.length) {
                    throw new Error(sitesData.error || 'No GSC sites found. Please check your Search Console access.')
                }

                // Use the first available site (or domain property if available)
                const domainSite = sitesData.data.sites.find((s: any) => s.siteUrl?.startsWith('sc-domain:'))
                const siteUrl = domainSite?.siteUrl || sitesData.data.sites[0].siteUrl

                // Trigger sync for the site
                const syncResponse = await fetch(
                    getApiUrl(`/api/integrations/gsc/sync`),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: parseInt(projectId),
                            siteUrl,
                            days: 30
                        })
                    }
                )
                const syncData = await syncResponse.json()

                if (syncData.success) {
                    setSyncResult({
                        id: integration.id,
                        message: `✅ Synced ${syncData.rowsSynced} rows from ${siteUrl}`,
                        success: true
                    })
                } else {
                    throw new Error(syncData.error || 'Sync failed')
                }
            } else if (integration.id === 'ga4') {
                // First, discover available properties
                const propertiesResponse = await fetch(
                    getApiUrl(`/api/integrations/ga4/properties?projectId=${projectId}&save=true`)
                )
                const propertiesData = await propertiesResponse.json()

                if (!propertiesData.success || !propertiesData.data.properties?.length) {
                    throw new Error(propertiesData.error || 'No GA4 properties found. Please check your Analytics access.')
                }

                // Use the first available property
                const propertyId = propertiesData.data.properties[0].propertyId

                // Trigger sync for the property
                const syncResponse = await fetch(
                    getApiUrl(`/api/integrations/ga4/sync`),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: parseInt(projectId),
                            propertyId,
                            days: 30
                        })
                    }
                )
                const syncData = await syncResponse.json()

                if (syncData.success) {
                    setSyncResult({
                        id: integration.id,
                        message: `✅ Synced ${syncData.rowsSynced} rows from property ${propertyId}`,
                        success: true
                    })
                } else {
                    throw new Error(syncData.error || 'Sync failed')
                }
            }

            // Refresh connection status
            await checkConnectionStatus()
        } catch (error: any) {
            console.error(`Failed to sync ${integration.name}:`, error)
            setSyncResult({
                id: integration.id,
                message: `❌ ${error.message || 'Sync failed'}`,
                success: false
            })
        } finally {
            setSyncing(null)
        }
    }

    const formatLastSync = (dateString?: string) => {
        if (!dateString) return "Never"

        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

        return date.toLocaleDateString()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Integrations</h1>
                <p className="text-muted-foreground mt-2">
                    Connect your Google accounts to sync data automatically
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {integrations.map((integration) => {
                    const Icon = integration.icon
                    const isConnected = integration.status === "connected"
                    const isConnecting = connecting === integration.id
                    const isDisconnecting = disconnecting === integration.id
                    const isSyncing = syncing === integration.id
                    const currentSyncResult = syncResult?.id === integration.id ? syncResult : null

                    return (
                        <Card key={integration.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>{integration.name}</CardTitle>
                                            <div className="mt-1">
                                                {isConnected ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Not Connected
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription>{integration.description}</CardDescription>

                                {isConnected && integration.data && (
                                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
                                        {integration.data.email && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="h-4 w-4" />
                                                <span>{integration.data.email}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>Last synced: {formatLastSync(integration.data.lastSync)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Sync Result Message */}
                                {currentSyncResult && (
                                    <div className={`p-3 rounded-lg text-sm ${currentSyncResult.success
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}>
                                        {currentSyncResult.message}
                                    </div>
                                )}

                                {isConnected ? (
                                    <div className="space-y-2">
                                        {/* Sync Now Button */}
                                        <Button
                                            className="w-full"
                                            onClick={() => handleSync(integration)}
                                            disabled={isSyncing}
                                        >
                                            {isSyncing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Syncing data...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    Sync Now
                                                </>
                                            )}
                                        </Button>
                                        {/* Disconnect Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => handleDisconnect(integration)}
                                            disabled={isDisconnecting || isSyncing}
                                        >
                                            {isDisconnecting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Disconnecting...
                                                </>
                                            ) : (
                                                "Disconnect"
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleConnect(integration)}
                                        disabled={isConnecting}
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            `Connect ${integration.name}`
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Info Section */}
            <Card>
                <CardHeader>
                    <CardTitle>How it works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        1. Click "Connect" to authorize access to your Google account
                    </p>
                    <p>
                        2. Grant read-only permissions to fetch your data
                    </p>
                    <p>
                        3. Data will sync automatically every day at 2:00 AM
                    </p>
                    <p>
                        4. You can disconnect anytime from this page
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
