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
  AlertTriangle
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useApiClient } from '@/hooks/useApi'

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
  const [pushToken, setPushToken] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const apiClient = useApiClient()

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    loadNotifications()
    loadPreferences()
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications/')
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const response = await apiClient.get('/notifications/preferences')
      setPreferences(response.data || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const updatePreference = async (notificationType: string, field: string, value: boolean) => {
    try {
      await apiClient.put(`/notifications/preferences/${notificationType}`, {
        [field]: value
      })
      setPreferences(prev => 
        prev.map(p => 
          p.notification_type === notificationType 
            ? { ...p, [field]: value }
            : p
        )
      )
      toast.success('Notification preferences updated')
    } catch (error) {
      console.error('Failed to update preference:', error)
      toast.error('Failed to update preferences')
    }
  }

  const updatePushToken = async () => {
    if (!pushToken.trim()) return
    
    try {
      setLoading(true)
      await apiClient.post('/notifications/push-token', {
        push_token: pushToken
      })
      toast.success('Push notification token updated')
    } catch (error) {
      console.error('Failed to update push token:', error)
      toast.error('Failed to update push token')
    } finally {
      setLoading(false)
    }
  }

  const updateWhatsAppNumber = async () => {
    if (!whatsappNumber.trim()) return
    
    try {
      setLoading(true)
      await apiClient.post('/notifications/whatsapp-number', {
        whatsapp_number: whatsappNumber
      })
      toast.success('WhatsApp number updated')
    } catch (error) {
      console.error('Failed to update WhatsApp number:', error)
      toast.error('Failed to update WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'MEDIUM': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SCHEDULE_PUBLISHED': return '📅'
      case 'SWAP_REQUEST': return '🔄'
      case 'SWAP_APPROVED': return '✅'
      case 'EMERGENCY_COVERAGE': return '🚨'
      default: return '📢'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative hover:bg-gray-100"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
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

          <TabsContent value="notifications" className="m-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <div className="p-3 border-b bg-gray-50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="w-full text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark all as read
                      </Button>
                    </div>
                  )}
                  
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50' : ''
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
                          
                          <p className="text-xs text-gray-600 mb-2">
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
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium mb-3">Notification Channels</h4>
                <div className="space-y-3">
                  {['SCHEDULE_PUBLISHED', 'SWAP_REQUEST', 'EMERGENCY_COVERAGE'].map(type => {
                    const pref = preferences.find(p => p.notification_type === type)
                    return (
                      <div key={type} className="space-y-2">
                        <h5 className="text-sm font-medium">{type.replace('_', ' ')}</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${type}-push`} className="text-xs">
                              <Smartphone className="w-3 h-3 mr-1 inline" />
                              Push
                            </Label>
                            <Switch
                              id={`${type}-push`}
                              checked={pref?.push_enabled ?? true}
                              onCheckedChange={(checked) => 
                                updatePreference(type, 'push_enabled', checked)
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`${type}-whatsapp`} className="text-xs">
                              <MessageSquare className="w-3 h-3 mr-1 inline" />
                              WhatsApp
                            </Label>
                            <Switch
                              id={`${type}-whatsapp`}
                              checked={pref?.whatsapp_enabled ?? false}
                              onCheckedChange={(checked) => 
                                updatePreference(type, 'whatsapp_enabled', checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label htmlFor="push-token" className="text-xs">Push Token</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="push-token"
                      placeholder="Enter push notification token"
                      value={pushToken}
                      onChange={(e) => setPushToken(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={updatePushToken}
                      disabled={loading || !pushToken.trim()}
                      className="text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="whatsapp-number" className="text-xs">WhatsApp Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="whatsapp-number"
                      placeholder="+1234567890"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={updateWhatsAppNumber}
                      disabled={loading || !whatsappNumber.trim()}
                      className="text-xs"
                    >
                      Save
                    </Button>
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