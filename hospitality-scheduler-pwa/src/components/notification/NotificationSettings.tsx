// src/components/notification/NotificationSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Smartphone, 
  MessageSquare, 
  Mail, 
  Bell,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Globe,
  Shield,
  Volume2
} from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { usePushNotificationContext } from '@/components/providers/PushNotificationProvider'

interface NotificationPreference {
  notification_type: string
  in_app_enabled: boolean
  push_enabled: boolean
  whatsapp_enabled: boolean
  email_enabled: boolean
}

interface NotificationTypeConfig {
  type: string
  title: string
  description: string
  icon: React.ReactNode
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL'
  defaultChannels: string[]
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    type: 'SCHEDULE_PUBLISHED',
    title: 'Schedule Published',
    description: 'When new schedules are published',
    icon: <Bell className="w-4 h-4" />,
    priority: 'HIGH',
    defaultChannels: ['in_app', 'push', 'whatsapp']
  },
  {
    type: 'SWAP_REQUEST',
    title: 'Swap Requests',
    description: 'When someone requests to swap shifts with you',
    icon: <Volume2 className="w-4 h-4" />,
    priority: 'URGENT',
    defaultChannels: ['in_app', 'push', 'whatsapp']
  },
  {
    type: 'SWAP_APPROVED',
    title: 'Swap Approved',
    description: 'When your swap request is approved',
    icon: <CheckCircle className="w-4 h-4" />,
    priority: 'HIGH',
    defaultChannels: ['in_app', 'push']
  },
  {
    type: 'SWAP_DENIED',
    title: 'Swap Denied',
    description: 'When your swap request is denied',
    icon: <AlertCircle className="w-4 h-4" />,
    priority: 'MEDIUM',
    defaultChannels: ['in_app', 'push']
  },
  {
    type: 'SCHEDULE_CHANGE',
    title: 'Schedule Changes',
    description: 'When your schedule is modified',
    icon: <Bell className="w-4 h-4" />,
    priority: 'HIGH',
    defaultChannels: ['in_app', 'push', 'whatsapp']
  },
  {
    type: 'SHIFT_REMINDER',
    title: 'Shift Reminders',
    description: 'Reminders before your shifts',
    icon: <Bell className="w-4 h-4" />,
    priority: 'MEDIUM',
    defaultChannels: ['in_app', 'push']
  },
  {
    type: 'EMERGENCY_COVERAGE',
    title: 'Emergency Coverage',
    description: 'Urgent coverage requests',
    icon: <AlertCircle className="w-4 h-4" />,
    priority: 'CRITICAL',
    defaultChannels: ['in_app', 'push', 'whatsapp']
  },
  {
    type: 'SWAP_ASSIGNMENT',
    title: 'Swap Assignments',
    description: 'When you are assigned to cover a shift',
    icon: <Volume2 className="w-4 h-4" />,
    priority: 'HIGH',
    defaultChannels: ['in_app', 'push', 'whatsapp']
  }
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-500'
    case 'URGENT': return 'bg-orange-500'
    case 'HIGH': return 'bg-yellow-500'
    case 'MEDIUM': return 'bg-blue-500'
    case 'LOW': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [tempWhatsappNumber, setTempWhatsappNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [whatsappSaving, setWhatsappSaving] = useState(false)
  
  const apiClient = useApiClient()
  const { user } = useAuth()
  const {
    hasPermission: hasPushPermission,
    needsPermission: needsPushPermission,
    isSupported: isPushSupported,
    token: pushToken,
    requestPermission: requestPushPermission
  } = usePushNotificationContext()

  // Load current preferences
  useEffect(() => {
    loadPreferences()
    if (user?.whatsapp_number) {
      setWhatsappNumber(user.whatsapp_number)
      setTempWhatsappNumber(user.whatsapp_number)
    }
  }, [user])

  const loadPreferences = async () => {
    if (!apiClient) return
    
    setLoading(true)
    try {
      const data = await apiClient.getNotificationPreferences()
      setPreferences(data || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (
    notificationType: string, 
    channel: 'in_app_enabled' | 'push_enabled' | 'whatsapp_enabled' | 'email_enabled', 
    enabled: boolean
  ) => {
    if (!apiClient) return

    // If trying to enable push notifications but no permission, request it first
    if (channel === 'push_enabled' && enabled && needsPushPermission) {
      const granted = await requestPushPermission()
      if (!granted) {
        toast.error('Push notifications permission required')
        return
      }
    }

    setSaving(true)
    try {
      await apiClient.updateNotificationPreferences({
        notification_type: notificationType,
        [channel]: enabled
      })

      // Update local state
      setPreferences(prev => {
        const existing = prev.find(p => p.notification_type === notificationType)
        if (existing) {
          return prev.map(p => 
            p.notification_type === notificationType 
              ? { ...p, [channel]: enabled }
              : p
          )
        } else {
          // Create new preference
          const newPref: NotificationPreference = {
            notification_type: notificationType,
            in_app_enabled: channel === 'in_app_enabled' ? enabled : true,
            push_enabled: channel === 'push_enabled' ? enabled : false,
            whatsapp_enabled: channel === 'whatsapp_enabled' ? enabled : false,
            email_enabled: channel === 'email_enabled' ? enabled : false
          }
          return [...prev, newPref]
        }
      })

      toast.success('Preference updated')
    } catch (error) {
      console.error('Failed to update preference:', error)
      toast.error('Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  const updateWhatsAppNumber = async () => {
    if (!apiClient) return

    setWhatsappSaving(true)
    try {
      // The API client method expects just the string, not an object
      await apiClient.updateWhatsAppNumber(tempWhatsappNumber)
      setWhatsappNumber(tempWhatsappNumber)
      toast.success('WhatsApp number updated')
    } catch (error) {
      console.error('Failed to update WhatsApp number:', error)
      toast.error('Failed to update WhatsApp number')
    } finally {
      setWhatsappSaving(false)
    }
  }

  const getPreferenceForType = (type: string): NotificationPreference => {
    return preferences.find(p => p.notification_type === type) || {
      notification_type: type,
      in_app_enabled: true,
      push_enabled: false,
      whatsapp_enabled: false,
      email_enabled: false
    }
  }

  const enablePushNotifications = async () => {
    if (!needsPushPermission) return
    
    const granted = await requestPushPermission()
    if (granted) {
      toast.success('🔔 Push notifications enabled!')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Notification Settings
        </h2>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Push Notification Status */}
      {isPushSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Receive notifications even when the app is closed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {hasPushPermission ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-700">Enabled</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-orange-700">Disabled</span>
                      </>
                    )}
                  </div>
                  {pushToken && (
                    <Badge variant="secondary" className="text-xs">Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasPushPermission 
                    ? 'You will receive push notifications on this device'
                    : 'Enable to receive notifications when the app is closed'
                  }
                </p>
              </div>
              {needsPushPermission && (
                <Button onClick={enablePushNotifications} size="sm">
                  Enable Push Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            WhatsApp Notifications
          </CardTitle>
          <CardDescription>
            Receive important notifications via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <div className="flex gap-2">
              <Input
                id="whatsapp"
                placeholder="+1234567890"
                value={tempWhatsappNumber}
                onChange={(e) => setTempWhatsappNumber(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={updateWhatsAppNumber}
                disabled={whatsappSaving || tempWhatsappNumber === whatsappNumber}
                size="sm"
              >
                {whatsappSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for USA, +44 for UK)
            </p>
          </div>
          
          {whatsappNumber && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              WhatsApp configured: {whatsappNumber}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Type Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose how you want to receive different types of notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {NOTIFICATION_TYPES.map((config, index) => {
              const preference = getPreferenceForType(config.type)
              
              return (
                <div key={config.type}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {config.icon}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{config.title}</h4>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs text-white ${getPriorityColor(config.priority)}`}
                          >
                            {config.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      {/* In-App */}
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <Switch
                          checked={preference.in_app_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(config.type, 'in_app_enabled', checked)
                          }
                          disabled={saving}
                        />
                      </div>
                      
                      {/* Push */}
                      {isPushSupported && (
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-500" />
                          <Switch
                            checked={preference.push_enabled}
                            onCheckedChange={(checked) => 
                              updatePreference(config.type, 'push_enabled', checked)
                            }
                            disabled={saving}
                          />
                        </div>
                      )}
                      
                      {/* WhatsApp */}
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <Switch
                          checked={preference.whatsapp_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(config.type, 'whatsapp_enabled', checked)
                          }
                          disabled={saving || !whatsappNumber}
                        />
                      </div>
                      
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-red-500" />
                        <Switch
                          checked={preference.email_enabled}
                          onCheckedChange={(checked) => 
                            updatePreference(config.type, 'email_enabled', checked)
                          }
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                  {index < NOTIFICATION_TYPES.length - 1 && <Separator />}
                </div>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium mb-3">Channel Types:</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>In-App</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-500" />
                <span>Push</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500" />
                <span>Email</span>
              </div>
            </div>
            {!whatsappNumber && (
              <p className="text-xs text-muted-foreground mt-2">
                * Set your WhatsApp number above to enable WhatsApp notifications
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}