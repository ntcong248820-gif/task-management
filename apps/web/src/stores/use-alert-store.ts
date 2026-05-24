"use client"

import { create } from "zustand"
import { getApiUrl } from "@/lib/config"
import type { Alert } from "@repo/types"

interface AlertStore {
  alerts: Alert[]
  unreadCount: number
  lastFetchedAt: Date | null
  markRead: (id: string) => void
  markAllRead: () => void
  fetchAlerts: () => Promise<void>
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  lastFetchedAt: null,

  markRead: async (id: string) => {
    set((s) => {
      const alerts = s.alerts.map((a) => a.id === id ? { ...a, isRead: true } : a)
      const unreadCount = alerts.filter((a) => !a.isRead).length
      return { alerts, unreadCount }
    })
    await fetch(getApiUrl(`/api/alerts/${id}/read`), { method: 'PATCH', credentials: 'include' })
  },

  markAllRead: async () => {
    set({ alerts: get().alerts.map((a) => ({ ...a, isRead: true })), unreadCount: 0 })
    await fetch(getApiUrl('/api/alerts/read-all'), { method: 'PATCH', credentials: 'include' })
  },

  fetchAlerts: async () => {
    try {
      const res = await fetch(getApiUrl('/api/alerts/count'), { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      if (!json.success) return

      const count = json.data?.count ?? 0

      // Fetch the 5 most recent unread for the bell dropdown
      if (count > 0) {
        const listRes = await fetch(getApiUrl('/api/alerts?unreadOnly=true&limit=5'), { credentials: 'include' })
        if (listRes.ok) {
          const listJson = await listRes.json()
          if (listJson.success) {
            set({ alerts: listJson.data ?? [], unreadCount: count, lastFetchedAt: new Date() })
            return
          }
        }
      }

      set({ alerts: [], unreadCount: count, lastFetchedAt: new Date() })
    } catch {
      // Silently fail — UI degrades gracefully
    }
  },
}))
