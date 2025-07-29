// src/components/notification/NotificationBell.tsx
// Beautiful notification bell component with clean UI
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BellRing, 
  Settings as SettingsIcon, 
  Check,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  ArrowRight,
  Eye,
  UserPlus,
  Loader2,
  MoreHorizontal
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface QuickAction {
  id: string
  label: string
  action: 'approve' | 'decline' | 'view' | 'respond' | 'cover'
  variant?: 'default' | 'outline' | 'destructive' | 'secondary'
  api_endpoint?: string
  method?: string
  url?: string
}

interface Notification {
  id: string
  title: string
  message: string
  notification_type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL'
  is_read: boolean
  created_at: string
  action_url?: string
  action_text?: string
  data?: {
    quick_actions?: QuickAction[]
    swap_id?: string
    schedule_id?: string
    shift_id?: string
    [key: string]: any
  }
}

interface NotificationPreference {
  notification_type: string
  in_app_enabled: boolean
  push_enabled: boolean
  whatsapp_enabled: boolean
  email_enabled: boolean
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const apiClient = useApiClient()
  const { isAuthenticated, accessToken, user } = useAuth()

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (isAuthenticated && apiClient) {
      loadNotifications()
    }
  }, [apiClient, isAuthenticated])

  useEffect(() => {
    if (open && isAuthenticated && apiClient) {
      loadPreferences()
    }
  }, [open, isAuthenticated, apiClient])

  const loadNotifications = async () => {
    if (!apiClient) return
    
    try {
      setLoading(true)
      const response = await apiClient.getMyNotifications({
        unreadOnly: false,
        inAppOnly: true,
        deliveredOnly: true,
        limit: 20
      })
      setNotifications(response || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const loadPreferences = async () => {
    if (!apiClient) return
    
    try {
      const preferences = await apiClient.getNotificationPreferences()
      setPreferences(preferences || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!apiClient) return
    
    try {
      await apiClient.markNotificationRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!apiClient) return
    
    try {
      await apiClient.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  const updatePreference = async (notificationType: string, field: string, value: boolean) => {
    if (!apiClient) return
    
    try {
      await apiClient.updateNotificationPreferences({
        notification_type: notificationType,
        [field]: value
      })
      setPreferences(prev => 
        prev.map(p => 
          p.notification_type === notificationType ? { ...p, [field]: value } : p)
      )
      toast.success('Preferences updated')
    } catch (error) {
      console.error('Failed to update preferences:', error)
      toast.error('Failed to update preferences')
    }
  }

  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    return 'http://localhost:8000'
  }

  const handleQuickAction = async (notification: Notification, action: QuickAction) => {
    if (!accessToken) {
      toast.error('You must be logged in to perform this action')
      return
    }
    
    setActionLoading(action.id)
    
    try {
      if (action.api_endpoint) {
        const backendUrl = getBackendUrl()
        
        const response = await fetch(`${backendUrl}${action.api_endpoint}`, {
          method: action.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (response.ok) {
          const result = await response.json()
          
          switch (action.action) {
            case 'approve':
              toast.success('✅ Request approved!')
              break
            case 'decline':
              toast.success('Request declined')
              break
            case 'cover':
              toast.success('🙋‍♂️ Thanks for volunteering!')
              break
            default:
              toast.success('Action completed successfully!')
          }
          
          await markAsRead(notification.id)
          await loadNotifications()
          
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `HTTP ${response.status}`)
        }
        
      } else if (action.url) {
        window.open(action.url, '_blank')
        await markAsRead(notification.id)
      }
      
    } catch (error) {
      console.error('Quick action failed:', error)
      toast.error(`Failed to ${action.action}: ${error.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id)
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SWAP_REQUEST':
        return <ArrowRight className="w-4 h-4 text-blue-600" />
      case 'SWAP_APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'SWAP_DENIED':
        return <X className="w-4 h-4 text-red-600" />
      case 'SCHEDULE_PUBLISHED':
        return <Calendar className="w-4 h-4 text-indigo-600" />
      case 'EMERGENCY_COVERAGE':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'SCHEDULE_CHANGE':
        return <RefreshCw className="w-4 h-4 text-blue-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-xs font-medium">Urgent</Badge>
      case 'CRITICAL':
        return <Badge variant="destructive" className="text-xs font-medium">Critical</Badge>
      case 'HIGH':
        return <Badge className="text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>
      case 'MEDIUM':
        return <Badge variant="secondary" className="text-xs font-medium">Medium</Badge>
      case 'LOW':
        return <Badge variant="outline" className="text-xs font-medium">Low</Badge>
      default:
        return null
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getQuickActionVariant = (variant?: string) => {
    switch (variant) {
      case 'destructive':
        return 'destructive' as const
      case 'outline':
        return 'outline' as const
      case 'secondary':
        return 'secondary' as const
      default:
        return 'default' as const
    }
  }

  const getQuickActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <Check className="w-3 h-3" />
      case 'decline':
        return <X className="w-3 h-3" />
      case 'cover':
        return <UserPlus className="w-3 h-3" />
      case 'view':
        return <Eye className="w-3 h-3" />
      default:
        return <ExternalLink className="w-3 h-3" />
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filterType !== 'all' && notification.notification_type !== filterType) return false
    if (filterPriority !== 'all' && notification.priority !== filterPriority) return false
    return true
  })

  if (!isAuthenticated) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 rounded-full"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-blue-600" />
          ) : (
            <Bell className="w-5 h-5 text-gray-600" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0 shadow-lg" align="end">
        <Tabs defaultValue="notifications" className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs px-2">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadNotifications}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-2"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          
          <TabsList className="grid w-full grid-cols-2 bg-gray-50/50">
            <TabsTrigger value="notifications" className="text-sm">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">
              <SettingsIcon className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="m-0">
            {/* Filters */}
            <div className="p-3 border-b bg-gray-50/30 flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SWAP_REQUEST">Swap Requests</SelectItem>
                  <SelectItem value="SCHEDULE_PUBLISHED">Schedules</SelectItem>
                  <SelectItem value="EMERGENCY_COVERAGE">Emergency</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Loading notifications...</span>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                  <Bell className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-900 leading-tight">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1">
                              {getPriorityBadge(notification.priority)}
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          
                          {/* Message */}
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Quick Actions */}
                          {notification.data?.quick_actions && notification.data.quick_actions.length > 0 && (
                            <div className="flex gap-2 pt-1">
                              {notification.data.quick_actions.map((action) => (
                                <Button
                                  key={action.id}
                                  variant={getQuickActionVariant(action.variant)}
                                  size="sm"
                                  className="h-7 px-3 text-xs font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickAction(notification, action)
                                  }}
                                  disabled={actionLoading === action.id}
                                >
                                  {actionLoading === action.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    getQuickActionIcon(action.action)
                                  )}
                                  <span className="ml-1.5">{action.label}</span>
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="m-0 p-4 space-y-4">
            <div>
              <h4 className="font-medium mb-3 text-sm">Notification Preferences</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin">
                {preferences.map((pref) => (
                  <div key={pref.notification_type} className="space-y-2 pb-2 border-b border-gray-100 last:border-0">
                    <Label className="text-xs font-medium text-gray-700">
                      {pref.notification_type.replace('_', ' ')}
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${pref.notification_type}-app`}
                          checked={pref.in_app_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(pref.notification_type, 'in_app_enabled', checked)
                          }
                        />
                        <Label htmlFor={`${pref.notification_type}-app`} className="text-xs">
                          In-App
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${pref.notification_type}-push`}
                          checked={pref.push_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(pref.notification_type, 'push_enabled', checked)
                          }
                        />
                        <Label htmlFor={`${pref.notification_type}-push`} className="text-xs">
                          Push
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}