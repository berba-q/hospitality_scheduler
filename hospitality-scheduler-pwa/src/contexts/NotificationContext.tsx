// contexts/NotificationContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
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
  const apiClient = useApiClient()

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Initial load
  useEffect(() => {
    refreshNotifications()
  }, [])

  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const newNotifications = await apiClient.getMyNotifications()
      
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
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [notifications, apiClient])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.markNotificationRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }, [apiClient])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }, [apiClient])

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
    loading,
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

// Real-time notification hook using WebSocket or Server-Sent Events
export function useRealtimeNotifications() {
  const { addNotification, refreshNotifications } = useNotifications()

  useEffect(() => {
    // Option 1: WebSocket connection (if you implement WebSocket support)
    // const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/notifications`)
    // ws.onmessage = (event) => {
    //   const notification = JSON.parse(event.data)
    //   addNotification(notification)
    // }

    // Option 2: Server-Sent Events (if you implement SSE support)
    // const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/notifications/stream`)
    // eventSource.onmessage = (event) => {
    //   const notification = JSON.parse(event.data)
    //   addNotification(notification)
    // }

    // Option 3: Polling with exponential backoff (current implementation)
    let pollInterval = 5000 // Start with 5 seconds
    const maxInterval = 60000 // Max 1 minute
    
    const poll = async () => {
      try {
        await refreshNotifications()
        pollInterval = 5000 // Reset to 5 seconds on success
      } catch (error) {
        pollInterval = Math.min(pollInterval * 1.5, maxInterval) // Exponential backoff
      }
      
      setTimeout(poll, pollInterval)
    }

    // Start polling after initial delay
    const timeoutId = setTimeout(poll, pollInterval)

    return () => {
      clearTimeout(timeoutId)
      // Clean up WebSocket or EventSource if used
      // ws?.close()
      // eventSource?.close()
    }
  }, [addNotification, refreshNotifications])
}