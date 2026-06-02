"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { getApiUrl } from "@/lib/config"

interface IntegrationStatus {
  connected: boolean
  accountEmail?: string
  lastSync?: string
  syncStatus?: string
  syncError?: string | null
}

interface IntegrationStatusData {
  gsc: IntegrationStatus
  ga4: IntegrationStatus
}

interface Site {
  siteUrl: string
  permissionLevel: string
}

interface Property {
  propertyId: string
  propertyName: string | null
}


export function useIntegrationStatus(projectId: string | null) {
  const key = projectId ? getApiUrl(`/api/integrations/status?projectId=${projectId}`) : null
  // fetcher already strips json.data — SWR receives { gsc, ga4 } directly
  const { data, error, isLoading, mutate } = useSWR<IntegrationStatusData>(
    key,
    fetcher,
    { revalidateOnFocus: false }
  )
  return {
    status: data,
    loading: isLoading,
    error,
    mutate,
  }
}

export function useIntegrationMutations() {
  async function authorize(provider: "gsc" | "ga4", projectId: string): Promise<{ authUrl: string }> {
    const endpoint = `/api/integrations/${provider}/authorize?projectId=${projectId}`
    const res = await fetch(getApiUrl(endpoint), {
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Failed to authorize ${provider.toUpperCase()}`)
    }
    return json.data
  }

  async function discoverResources(
    provider: "gsc" | "ga4",
    projectId: string,
    save: boolean = false
  ): Promise<{ sites?: Site[]; properties?: Property[] }> {
    const endpoint = `/api/integrations/${provider}/${provider === "gsc" ? "sites" : "properties"}?projectId=${projectId}${save ? "&save=true" : ""}`
    const res = await fetch(getApiUrl(endpoint), {
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Failed to discover ${provider.toUpperCase()} resources`)
    }
    return json.data
  }

  async function sync(
    provider: "gsc" | "ga4",
    projectId: string,
    resourceId: string,
    days: number = 30
  ): Promise<{ rowsSynced: number; dateRange: { start: string; end: string } }> {
    const endpoint = `/api/integrations/${provider}/sync`
    const body = provider === "gsc"
      ? { projectId, siteUrl: resourceId, days }
      : { projectId, propertyId: resourceId, days }

    const res = await fetch(getApiUrl(endpoint), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Failed to sync ${provider.toUpperCase()}`)
    }
    return json
  }

  async function disconnect(provider: "gsc" | "ga4", projectId: string): Promise<void> {
    const endpoint = `/api/integrations/${provider}/disconnect?projectId=${projectId}`
    const res = await fetch(getApiUrl(endpoint), {
      method: "DELETE",
      credentials: "include",
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Failed to disconnect ${provider.toUpperCase()}`)
    }
  }

  return { authorize, discoverResources, sync, disconnect }
}
