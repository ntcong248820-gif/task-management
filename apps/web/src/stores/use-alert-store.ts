"use client"

import { create } from "zustand"
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
  markRead: (id) => {
    const alerts = get().alerts.filter((alert) => alert.id !== id)
    set({ alerts, unreadCount: alerts.length })
  },
  markAllRead: () => set({ alerts: [], unreadCount: 0 }),
  fetchAlerts: async () => {
    set({ alerts: [], unreadCount: 0, lastFetchedAt: new Date() })
  },
}))
