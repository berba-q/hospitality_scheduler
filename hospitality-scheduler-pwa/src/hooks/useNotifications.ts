// Notifications hook
import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(false)
  const apiClient = useApiClient()

  const loadNotifications = useCallback(async (unreadOnly = false) => {
    try {
      const data = await apiClient.getMyNotifications({ unread_only: unreadOnly })
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }, [apiClient])

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationRead(notificationId)
      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead()
      await loadNotifications()
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to update notifications')
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications
  }
}