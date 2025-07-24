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
  refreshNotifications: () => Promise<void>
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

  const refreshNotifications = useCallback(async () => {
    // FIXED: Don't make API calls if auth is not ready
    if (authLoading || !apiClient || !isAuthenticated) {
      console.log('🔔 Skipping notification refresh - auth not ready:', { 
        authLoading, 
        hasApiClient: !!apiClient, 
        isAuthenticated 
      })
      return
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
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
      // Don't show error toast if it's just auth not ready
      if (!authLoading && isAuthenticated) {
        toast.error('Failed to load notifications')
      }
    } finally {
      setLoading(false)
    }
  }, [notifications, apiClient, authLoading, isAuthenticated]) // FIXED: Added auth dependencies

  // FIXED: Auto-refresh only when auth is ready
  useEffect(() => {
    // Don't start interval if auth is not ready
    if (authLoading || !apiClient || !isAuthenticated) {
      return
    }

    console.log('🔔 Starting notification auto-refresh interval')
    const id = setInterval(() => {
      refreshNotifications()
    }, 30_000)

    return () => {
      console.log('🔔 Stopping notification auto-refresh interval')
      clearInterval(id)
    }
  }, [refreshNotifications, authLoading, apiClient, isAuthenticated]) // FIXED: Added auth deps

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

    // Option 3: Polling with exponential backoff (current implementation)
    let pollInterval = 5000 // Start with 5 seconds
    const maxInterval = 60000 // Max 1 minute
    let timeoutId: NodeJS.Timeout
    
    const poll = async () => {
      try {
        // Double-check auth is still ready before polling
        if (!authLoading && isAuthenticated && apiClient) {
          await refreshNotifications()
          pollInterval = 5000 // Reset to 5 seconds on success
        }
      } catch (error) {
        console.warn('Notification polling error:', error)
        pollInterval = Math.min(pollInterval * 1.5, maxInterval) // Exponential backoff
      }
      
      // Schedule next poll only if auth is still ready
      if (!authLoading && isAuthenticated && apiClient) {
        timeoutId = setTimeout(poll, pollInterval)
      }
    }

    // Start polling after initial delay
    timeoutId = setTimeout(poll, pollInterval)

    return () => {
      console.log('🔔 Stopping realtime notification polling')
      clearTimeout(timeoutId)
    }
  }, [addNotification, refreshNotifications, authLoading, isAuthenticated, apiClient]) // FIXED: Added auth deps
}