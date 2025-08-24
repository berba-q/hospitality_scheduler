// contexts/NotificationContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  message: string
  notification_type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  is_read: boolean
  created_at: string
  action_url?: string
  action_text?: string
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<{ ok: boolean; retryAfterMs?: number }>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  
  // FIXED: Get both apiClient and auth status
  const apiClient = useApiClient()
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  const refreshNotifications = useCallback(async (): Promise<{ ok: boolean; retryAfterMs?: number }> => {
    // FIXED: Don't make API calls if auth is not ready
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
        notifications.filter(n => !n.is_read).map(n => n.id)
      )
      const newUnreadNotifications = newNotifications.filter(
        (n: Notification) => !n.is_read && !previousUnreadIds.has(n.id)
      )

      // Show toast for new notifications
      newUnreadNotifications.forEach((notification: Notification) => {
        if (notification.priority === 'CRITICAL') {
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
      const anyErr: any = error
      try {
        // fetch Response-like
        const hdrGet = anyErr?.response?.headers?.get?.bind?.(anyErr.response.headers)
        const hdrObj = anyErr?.response?.headers
        const retryAfter = hdrGet ? hdrGet('Retry-After') : (hdrObj ? (hdrObj['retry-after'] || hdrObj['Retry-After']) : undefined)
        if (retryAfter) {
          const s = parseInt(String(retryAfter), 10)
          if (!Number.isNaN(s) && s > 0) retryAfterMs = s * 1000
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
  }, [notifications, apiClient, authLoading, isAuthenticated]) // FIXED: Added auth dependencies

  // FIXED: Initial load only when auth is ready
  useEffect(() => {
    // Only load when auth is completely ready
    if (!authLoading && isAuthenticated && apiClient) {
      console.log('🔔 Auth ready - loading initial notifications')
      refreshNotifications()
    } else {
      console.log('🔔 Auth not ready - waiting...', { authLoading, isAuthenticated, hasApiClient: !!apiClient })
    }
  }, [authLoading, isAuthenticated, apiClient]) // FIXED: Simpler dependencies

  const markAsRead = useCallback(async (id: string) => {
    // FIXED: Check auth before making API call
    if (!apiClient || !isAuthenticated) {
      toast.error('Authentication required')
      return
    }

    try {
      await apiClient.markNotificationRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
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
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }, [apiClient, isAuthenticated])

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading: loading || authLoading, // FIXED: Include auth loading
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

// FIXED: Real-time notification hook with auth checks
export function useRealtimeNotifications() {
  const { addNotification, refreshNotifications } = useNotifications()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const apiClient = useApiClient()

  useEffect(() => {
    // FIXED: Don't start polling if auth is not ready
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