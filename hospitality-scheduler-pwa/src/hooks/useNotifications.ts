// Notifications hook
import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import type { Notification } from '@/types/api'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const apiClient = useApiClient()

  const loadNotifications = useCallback(async (unreadOnly = false): Promise<void> => {
    if (!apiClient) {
      console.error('API client not available')
      return
    }

    setLoading(true)
    try {
      const data = await apiClient.getMyNotifications({ unreadOnly })
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read_at).length)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [apiClient])

  const markAsRead = async (notificationId: string): Promise<void> => {
    if (!apiClient) {
      toast.error('API client not available')
      return
    }

    try {
      await apiClient.markNotificationRead(notificationId)
      await loadNotifications()
      toast.success('Notification marked as read')
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async (): Promise<void> => {
    if (!apiClient) {
      toast.error('API client not available')
      return
    }

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
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications
  }
}