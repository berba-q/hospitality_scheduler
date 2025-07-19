// components/notification/NotificationBell.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  BellOff
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useNotifications } from '@/contexts/NotificationContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface NotificationPreference {
  notification_type: string
  in_app_enabled: boolean
  push_enabled: boolean
  whatsapp_enabled: boolean
  email_enabled: boolean
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [pushToken, setPushToken] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [preferencesLoading, setPreferencesLoading] = useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications()

  useEffect(() => {
    if (open) {
      loadPreferences()
    }
  }, [open])

  // Filter notifications based on selected filters
  const filteredNotifications = notifications.filter(notification => {
    if (filterType !== 'all' && notification.notification_type !== filterType) {
      return false
    }
    if (filterPriority !== 'all' && notification.priority !== filterPriority) {
      return false
    }
    return true
  })

  const loadPreferences = async () => {
    try {
      setPreferencesLoading(true)
      // Load preferences from API
      // const response = await apiClient.get('/notifications/preferences')
      // setPreferences(response.data || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setPreferencesLoading(false)
    }
  }

  const updatePreference = async (type: string, field: string, value: boolean) => {
    try {
      // await apiClient.put(`/notifications/preferences/${type}`, {
      //   [field]: value
      // })
      setPreferences(prev => 
        prev.map(p => p.notification_type === type ? { ...p, [field]: value } : p)
      )
      toast.success('Preference updated')
    } catch (error) {
      console.error('Failed to update preference:', error)
      toast.error('Failed to update preference')
    }
  }

  const updatePushToken = async () => {
    try {
      // await apiClient.put('/notifications/push-token', { token: pushToken })
      toast.success('Push token updated')
    } catch (error) {
      console.error('Failed to update push token:', error)
      toast.error('Failed to update push token')
    }
  }

  const updateWhatsAppNumber = async () => {
    try {
      // await apiClient.put('/notifications/whatsapp-number', { number: whatsappNumber })
      toast.success('WhatsApp number updated')
    } catch (error) {
      console.error('Failed to update WhatsApp number:', error)
      toast.error('Failed to update WhatsApp number')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SCHEDULE_PUBLISHED':
        return '📅'
      case 'SWAP_REQUEST':
        return '🔄'
      case 'SWAP_APPROVED':
        return '✅'
      case 'SWAP_DENIED':
        return '❌'
      case 'EMERGENCY_COVERAGE':
        return '🚨'
      case 'SHIFT_REMINDER':
        return '⏰'
      default:
        return '📢'
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
        return 'border-gray-500 text-gray-700 bg-gray-50'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  // Enhanced visual states for different priority levels
  const getBellStyle = () => {
    const hasUnread = unreadCount > 0
    const hasCritical = notifications.some(n => !n.is_read && n.priority === 'CRITICAL')
    const hasHigh = notifications.some(n => !n.is_read && n.priority === 'HIGH')

    if (hasCritical) {
      return 'text-red-600 animate-pulse'
    } else if (hasHigh) {
      return 'text-orange-600 animate-bounce'
    } else if (hasUnread) {
      return 'text-blue-600'
    }
    return 'text-gray-400'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 hover:bg-gray-100 ${getBellStyle()}`}
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

      <PopoverContent className="w-96 p-0" align="end">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between p-4 border-b">
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

          <TabsContent value="notifications" className="m-0">
            {/* Filters */}
            <div className="p-3 border-b bg-gray-50 space-y-2">
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

            <div className="max-h-96 overflow-y-auto">
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
                <>
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg">
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
                            
                            <div className="flex gap-1">
                              {notification.action_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    window.open(notification.action_url, '_blank')
                                    markAsRead(notification.id)
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {notification.action_text || 'View'}
                                </Button>
                              )}
                              
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
              {/* Quick Actions */}
              <div>
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="w-full justify-start"
                    disabled={unreadCount === 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark All as Read ({unreadCount})
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear all read notifications
                      toast.success('Read notifications cleared')
                    }}
                    className="w-full justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Read Notifications
                  </Button>
                </div>
              </div>

              {/* Device Settings */}
              <div>
                <h4 className="font-medium mb-3">Device Settings</h4>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="push-token" className="text-sm">Push Notification Token</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="push-token"
                        placeholder="Enter push token"
                        value={pushToken}
                        onChange={(e) => setPushToken(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={updatePushToken}>
                        <Smartphone className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsapp-number" className="text-sm">WhatsApp Number</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="whatsapp-number"
                        placeholder="+1234567890"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={updateWhatsAppNumber}>
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div>
                <h4 className="font-medium mb-3">Notification Preferences</h4>
                
                {preferencesLoading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading preferences...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {preferences.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">
                        No preferences configured
                      </p>
                    ) : (
                      preferences.map((pref) => (
                        <div key={pref.notification_type} className="space-y-2">
                          <h5 className="text-sm font-medium">
                            {pref.notification_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </h5>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <Label>In-App</Label>
                              <Switch
                                checked={pref.in_app_enabled}
                                onCheckedChange={(checked) => 
                                  updatePreference(pref.notification_type, 'in_app_enabled', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label>Push</Label>
                              <Switch
                                checked={pref.push_enabled}
                                onCheckedChange={(checked) => 
                                  updatePreference(pref.notification_type, 'push_enabled', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label>WhatsApp</Label>
                              <Switch
                                checked={pref.whatsapp_enabled}
                                onCheckedChange={(checked) => 
                                  updatePreference(pref.notification_type, 'whatsapp_enabled', checked)
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label>Email</Label>
                              <Switch
                                checked={pref.email_enabled}
                                onCheckedChange={(checked) => 
                                  updatePreference(pref.notification_type, 'email_enabled', checked)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Global Settings */}
              <div>
                <h4 className="font-medium mb-3">Global Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Do Not Disturb Mode</Label>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Sound Notifications</Label>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Desktop Notifications</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}