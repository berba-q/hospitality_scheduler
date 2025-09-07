// components/notification/FloatingNotificationIndicator.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, X, Eye, ArrowUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTranslations } from '@/hooks/useTranslations'

interface FloatingNotificationIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showOnlyWhenHidden?: boolean // Only show when main notification bell is not visible
}

export function FloatingNotificationIndicator({ 
  position = 'bottom-right',
  showOnlyWhenHidden = true 
}: FloatingNotificationIndicatorProps) {
  const { t } = useTranslations()
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const [isVisible, setIsVisible] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<any>(null)
  const [isScrolledDown, setIsScrolledDown] = useState(false)

  // Track scroll position to show/hide indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolledDown(scrollTop > 100) // Show when scrolled down more than 100px
    }

    if (showOnlyWhenHidden) {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    } else {
      setIsScrolledDown(true) // Always show if not dependent on scroll
    }
  }, [showOnlyWhenHidden])

  // Show indicator when there are unread notifications and appropriate conditions are met
  useEffect(() => {
    const shouldShow = unreadCount > 0 && (showOnlyWhenHidden ? isScrolledDown : true)
    setIsVisible(shouldShow)

    // Set the most recent unread notification for display
    if (shouldShow) {
      const latestUnread = notifications.find(n => !n.is_read)
      setCurrentNotification(latestUnread)
    }
  }, [unreadCount, isScrolledDown, notifications, showOnlyWhenHidden])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
      default:
        return 'bottom-4 right-4'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'MEDIUM':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'LOW':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const handleMarkAsRead = () => {
    if (currentNotification) {
      markAsRead(currentNotification.id)
    }
  }

  const handleViewAll = () => {
    // Scroll to top to show the main notification bell
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // You could also trigger opening the notification bell here
  }

  if (!isVisible || !currentNotification) {
    return null
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 animate-in slide-in-from-bottom-4 duration-300`}>
      <Card className="w-80 shadow-lg border-2 border-blue-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Priority Icon */}
            <div className="flex-shrink-0 mt-1">
              {getPriorityIcon(currentNotification.priority)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold truncate">
                  {currentNotification.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className="text-xs flex-shrink-0"
                >
                  {unreadCount > 1 ? `+${unreadCount - 1}` : t('notifications.new')}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                {currentNotification.message}
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkAsRead}
                  className="h-7 px-2 text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('notifications.markRead')}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleViewAll}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {t('common.viewAll')}
                </Button>
                
                {currentNotification.action_url && (
                  <Button
                    size="sm"
                    onClick={() => {
                      window.open(currentNotification.action_url, '_blank')
                      handleMarkAsRead()
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    {currentNotification.action_text || t('common.view')}
                  </Button>
                )}
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="p-1 h-6 w-6 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Notification Count Badge */}
          {unreadCount > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('notifications.unreadNotifications', { count: unreadCount })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAll}
                  className="h-5 px-2 text-xs"
                >
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {t('notifications.goToTop')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Mini floating bell for minimal footprint
export function MiniFloatingBell() {
  const { unreadCount } = useNotifications()
  const [isScrolledDown, setIsScrolledDown] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolledDown(scrollTop > 200)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isScrolledDown || unreadCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Button
        onClick={handleClick}
        className="relative w-12 h-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Bell className="w-5 h-5" />
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      </Button>
    </div>
  )
}