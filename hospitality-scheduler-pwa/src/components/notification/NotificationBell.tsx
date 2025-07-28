// src/app/components/notification/NotificationBell.tsx
// Notification bell component
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BellRing, 
  Settings as SettingsIcon, 
  MessageSquare, 
  Smartphone,
  Check,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Filter,
  Calendar,
  ArrowRight,
  Eye,
  UserPlus,
  Loader2
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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  is_read: boolean
  created_at: string
  action_url?: string
  action_text?: string
  // Enhanced action support
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
  const [pushToken, setPushToken] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // ✅ Use NextAuth hooks instead of localStorage
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
      const response = await apiClient.getMyNotifications({
        unreadOnly: true,
        inAppOnly: true,
        deliveredOnly: true,
      })
      setNotifications(response || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
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
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    if (!apiClient) return
    
    try {
      await apiClient.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }

  const refreshNotifications = async () => {
    setLoading(true)
    try {
      await loadNotifications()
    } finally {
      setLoading(false)
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filterType !== 'all' && notification.notification_type !== filterType) {
      return false
    }
    if (filterPriority !== 'all' && notification.priority !== filterPriority) {
      return false
    }
    return true
  })

  const updatePreference = async (type: string, field: string, value: boolean) => {
    if (!apiClient) return
    
    try {
      await apiClient.updateNotificationPreferences({
        notification_type: type,
        [field]: value
      })
      setPreferences(prev => 
        prev.map(p => p.notification_type === type ? { ...p, [field]: value } : p)
      )
      toast.success('Preferences updated')
    } catch (error) {
      console.error('Failed to update preferences:', error)
      toast.error('Failed to update preferences')
    }
  }

  // Utility function to get backend URL
  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    return 'http://localhost:8000'
  }

  // Handle quick actions
  const handleQuickAction = async (notification: Notification, action: QuickAction) => {
    if (!accessToken) {
      toast.error('You must be logged in to perform this action')
      return
    }
    
    setActionLoading(action.id)
    
    try {
      if (action.api_endpoint) {
        const backendUrl = getBackendUrl()
        
        console.log('Quick action:', action)
        console.log('Making request to:', `${backendUrl}${action.api_endpoint}`)
        console.log('Using NextAuth token')
        
        // Make API request for quick action
        const response = await fetch(`${backendUrl}${action.api_endpoint}`, {
          method: action.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        console.log('API response:', response.status, response.statusText)
        
        if (response.ok) {
          const result = await response.json()
          
          // Show success message based on action
          switch (action.action) {
            case 'approve':
              toast.success('Request approved!')
              break
            case 'decline':
              toast.success('Request declined')
              break
            case 'cover':
              toast.success('Thanks for volunteering!')
              break
            default:
              toast.success(`${action.label} completed successfully!`)
          }
          
          // Mark notification as read and refresh
          await markAsRead(notification.id)
          await loadNotifications()
          
        } else {
          const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
          
          // ✅ Better error handling
          if (response.status === 404) {
            toast.warning(`${action.label} endpoint not found - feature may not be implemented yet`)
          } else if (response.status === 401) {
            toast.error('Authentication expired - please log in again')
          } else {
            toast.error(error.detail || `Failed to ${action.label.toLowerCase()}`)
          }
        }
        
      } else if (action.url) {
        // Handle URL-based actions
        await markAsRead(notification.id)
        
        const backendUrl = getBackendUrl()
        let targetUrl = action.url
        
        // If URL is relative and seems like an API endpoint, use backend URL
        if (action.url.startsWith('/api/')) {
          targetUrl = `${backendUrl}${action.url}`
        } else if (action.url.startsWith('/')) {
          // Internal frontend route
          window.location.href = action.url
          setOpen(false)
          return
        }
        
        // External URL or backend API URL
        window.open(targetUrl, '_blank')
        setOpen(false) // Close popover
      }
      
    } catch (error) {
      console.error('Quick action failed:', error)
      toast.error(`Failed to ${action.label.toLowerCase()}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    // Navigate to action URL if available
    if (notification.action_url) {
      if (notification.action_url.startsWith('/')) {
        window.location.href = notification.action_url
      } else {
        window.open(notification.action_url, '_blank')
      }
      setOpen(false) // Close popover
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SCHEDULE_PUBLISHED':
        return <Calendar className="w-4 h-4 text-blue-600" />
      case 'SWAP_REQUEST':
        return <ArrowRight className="w-4 h-4 text-orange-600" />
      case 'SWAP_APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'SWAP_DENIED':
        return <X className="w-4 h-4 text-red-600" />
      case 'EMERGENCY_COVERAGE':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'SHIFT_REMINDER':
        return <Clock className="w-4 h-4 text-gray-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-red-500 text-red-700 bg-red-50'
      case 'HIGH':
        return 'border-orange-500 text-orange-700 bg-orange-50'
      case 'MEDIUM':
        return 'border-blue-500 text-blue-700 bg-blue-50'
      case 'LOW':
        return 'border-gray-500 text-gray-700 bg-gray-50'
      default:
        return 'border-gray-300 text-gray-600'
    }
  }

  const getBellStyle = () => {
    const highPriorityCount = notifications.filter(n => 
      !n.is_read && (n.priority === 'CRITICAL' || n.priority === 'HIGH')
    ).length
    
    if (highPriorityCount > 0) {
      return 'text-red-600 animate-pulse'
    }
    return 'text-blue-600'
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

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative p-2"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className={`w-5 h-5 ${getBellStyle()}`} />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-96 p-0 max-h-[600px] flex flex-col" 
        align="end" 
        side="bottom"
        sideOffset={5}
      >
        <Tabs defaultValue="notifications" className="w-full flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshNotifications}
                disabled={loading}
                className="p-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <TabsList className="h-8">
                <TabsTrigger value="notifications" className="text-xs">
                  <Bell className="w-3 h-3 mr-1" />
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <SettingsIcon className="w-3 h-3 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="notifications" className="m-0 flex flex-col flex-1 min-h-0">
            {/* Filters - Fixed */}
            <div className="p-3 border-b bg-gray-50 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SCHEDULE_PUBLISHED">Schedule</SelectItem>
                    <SelectItem value="SWAP_REQUEST">Swap Request</SelectItem>
                    <SelectItem value="EMERGENCY_COVERAGE">Emergency</SelectItem>
                    <SelectItem value="SHIFT_REMINDER">Reminder</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="w-full text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all as read ({unreadCount})
                </Button>
              )}
            </div>

            {/* Scrollable notification list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                  {(filterType !== 'all' || filterPriority !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterType('all')
                        setFilterPriority('all')
                      }}
                      className="mt-2 text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            
                            <div className="flex gap-1 flex-wrap">
                              {/* Quick Action Buttons */}
                              {notification.data?.quick_actions?.map((action) => (
                                <Button
                                  key={action.id}
                                  variant={getQuickActionVariant(action.variant)}
                                  size="sm"
                                  className="h-6 px-2 text-xs"
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
                                  <span className="ml-1">{action.label}</span>
                                </Button>
                              ))}
                              
                              {/* Default action button if no quick actions */}
                              {(!notification.data?.quick_actions || notification.data.quick_actions.length === 0) && 
                               notification.action_url && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-6 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleNotificationClick(notification)
                                  }}
                                >
                                  {notification.action_text || 'View'}
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                              
                              {/* Mark as read button */}
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="m-0 p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="push-token" className="text-sm font-medium">
                  Push Token
                </Label>
                <Input
                  id="push-token"
                  value={pushToken}
                  onChange={(e) => setPushToken(e.target.value)}
                  placeholder="Firebase push token"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="whatsapp-number" className="text-sm font-medium">
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsapp-number"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Notification Preferences</h4>
                {preferences.map((pref) => (
                  <div key={pref.notification_type} className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">
                      {pref.notification_type.replace('_', ' ')}
                    </Label>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${pref.notification_type}-app`}
                          checked={pref.in_app_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(pref.notification_type, 'in_app_enabled', checked)
                          }
                        />
                        <Label htmlFor={`${pref.notification_type}-app`}>In-App</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${pref.notification_type}-push`}
                          checked={pref.push_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(pref.notification_type, 'push_enabled', checked)
                          }
                        />
                        <Label htmlFor={`${pref.notification_type}-push`}>Push</Label>
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