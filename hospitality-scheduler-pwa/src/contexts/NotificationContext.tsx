// contexts/NotificationContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as ApiTypes from '@/types/api'

interface NotificationContextType {
  notifications: ApiTypes.Notification[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<{ ok: boolean; retryAfterMs?: number }>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: ApiTypes.Notification) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ApiTypes.Notification[]>([])
  const [loading, setLoading] = useState(false)

  // Get both apiClient and auth status
  const apiClient = useApiClient()
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  const refreshNotifications = useCallback(async (): Promise<{ ok: boolean; retryAfterMs?: number }> => {
    // Don't make API calls if auth is not ready
    if (authLoading || !apiClient || !isAuthenticated) {
      console.log('🔔 Skipping notification refresh - auth not ready:', {
        authLoading,
        hasApiClient: !!apiClient,
        isAuthenticated
      })
      return { ok: false }
    }

    try {
      setLoading(true)
      console.log('🔔 Refreshing notifications...')

      const newNotifications = await apiClient.getMyNotifications({
        unreadOnly: true,
        inAppOnly: true,
        deliveredOnly: true,
      })

      // Check for new unread notifications to show toast
      const previousUnreadIds = new Set(
        notifications.filter(n => n.status !== 'read').map(n => n.id)
      )
      const newUnreadNotifications = newNotifications.filter(
        (n: ApiTypes.Notification) => n.status !== 'read' && !previousUnreadIds.has(n.id)
      )

      // Show toast for new notifications
      newUnreadNotifications.forEach((notification: ApiTypes.Notification) => {
        if (notification.priority === 'URGENT') {
          toast.error(notification.title, {
            description: notification.message,
            duration: 10000,
          })
        } else if (notification.priority === 'HIGH') {
          toast.warning(notification.title, {
            description: notification.message,
            duration: 5000,
          })
        } else {
          toast.info(notification.title, {
            description: notification.message,
            duration: 3000,
          })
        }
      })

      setNotifications(newNotifications)
      console.log(`🔔 Loaded ${newNotifications.length} notifications`)
      return { ok: true }
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
      // Respect server rate-limit hints when available
      let retryAfterMs: number | undefined
      try {
        // fetch Response-like
        if (error && typeof error === 'object' && 'response' in error) {
          const response = (error as { response?: { headers?: unknown } }).response
          if (response && typeof response === 'object' && 'headers' in response) {
            const headers = response.headers
            let retryAfter: string | undefined

            if (typeof headers === 'object' && headers !== null) {
              if ('get' in headers && typeof (headers as { get: unknown }).get === 'function') {
                retryAfter = (headers as { get: (key: string) => string | null }).get('Retry-After') ?? undefined
              } else {
                retryAfter = (headers as Record<string, string>)['retry-after'] || (headers as Record<string, string>)['Retry-After']
              }
            }

            if (retryAfter) {
              const s = parseInt(String(retryAfter), 10)
              if (!Number.isNaN(s) && s > 0) retryAfterMs = s * 1000
            }
          }
        }
      } catch {}
      // Don't show error toast if it's just auth not ready
      if (!authLoading && isAuthenticated) {
        toast.error('Failed to load notifications')
      }
      return { ok: false, retryAfterMs }
    } finally {
      setLoading(false)
    }
    return { ok: false }
  }, [notifications, apiClient, authLoading, isAuthenticated]) 

  // Initial load only when auth is ready
  useEffect(() => {
    // Only load when auth is completely ready
    if (!authLoading && isAuthenticated && apiClient) {
      console.log('🔔 Auth ready - loading initial notifications')
      refreshNotifications()
    } else {
      console.log('🔔 Auth not ready - waiting...', { authLoading, isAuthenticated, hasApiClient: !!apiClient })
    }
  }, [authLoading, isAuthenticated, apiClient, refreshNotifications])

  const markAsRead = useCallback(async (id: string) => {
    // Check auth before making API call
    if (!apiClient || !isAuthenticated) {
      toast.error('Authentication required')
      return
    }

    try {
      await apiClient.markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }, [apiClient, isAuthenticated])

  const markAllAsRead = useCallback(async () => {
    // FIXED: Check auth before making API call
    if (!apiClient || !isAuthenticated) {
      toast.error('Authentication required')
      return
    }

    try {
      await apiClient.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })))
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }, [apiClient, isAuthenticated])

  const addNotification = useCallback((notification: ApiTypes.Notification) => {
    setNotifications(prev => [notification, ...prev])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => n.status !== 'read').length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading: loading || authLoading, 
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Real-time notification hook with auth checks
export function useRealtimeNotifications() {
  const { addNotification, refreshNotifications } = useNotifications()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const apiClient = useApiClient()

  useEffect(() => {
    // Don't start polling if auth is not ready
    if (authLoading || !apiClient || !isAuthenticated) {
      console.log('🔔 Realtime notifications waiting for auth...')
      return
    }

    console.log('🔔 Starting realtime notification polling')

    let pollInterval = 5000 // base
    const maxInterval = 60000 // cap at 60s
    let timeoutId: NodeJS.Timeout | null = null

    const schedule = (ms: number) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(poll, ms)
    }

    const poll = async () => {
      // pause if tab hidden or offline
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        // wait until visible
        return
      }
      if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
        // retry later when back online
        pollInterval = Math.min(pollInterval * 1.5, maxInterval)
        schedule(pollInterval)
        return
      }

      try {
        const result = await refreshNotifications()
        if (result?.ok) {
          pollInterval = 5000 // reset to base on success
        } else if (result?.retryAfterMs) {
          // server asked us to back off explicitly
          pollInterval = Math.min(Math.max(result.retryAfterMs, 5000), maxInterval)
        } else {
          // generic backoff
          pollInterval = Math.min(pollInterval * 1.5, maxInterval)
        }
      } catch (err) {
        console.warn('Notification polling error:', err)
        pollInterval = Math.min(pollInterval * 1.5, maxInterval)
      }

      schedule(pollInterval)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // when tab becomes visible, poll immediately and reset cadence
        pollInterval = 5000
        schedule(0)
      } else if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const handleOnline = () => {
      pollInterval = 5000
      schedule(0)
    }
    const handleOffline = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // start after initial delay
    schedule(pollInterval)

    return () => {
      console.log('🔔 Stopping realtime notification polling')
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addNotification, refreshNotifications, authLoading, isAuthenticated, apiClient]) // FIXED: Added auth deps
}