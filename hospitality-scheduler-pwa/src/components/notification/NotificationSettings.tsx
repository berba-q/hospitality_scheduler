// src/components/notification/NotificationSettings.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Volume2
} from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { usePushNotificationContext } from '@/components/providers/PushNotificationProvider'
import { useTranslations } from '@/hooks/useTranslations'
import { PushStatsResponse } from '@/types/api'

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
  const { t } = useTranslations()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [tempWhatsappNumber, setTempWhatsappNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [whatsappSaving, setWhatsappSaving] = useState(false)
  const [pushStats, setPushStats] = useState<PushStatsResponse | null>(null);
  
  const apiClient = useApiClient()
  const { user } = useAuth()
  const {
    hasPushPermission,
    needsPushPermission,
    isSupported: isPushSupported,
    token: pushToken,
    requestPermission: requestPushPermission
  } = usePushNotificationContext()

  const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
    {
      type: 'SCHEDULE_PUBLISHED',
      title: t('notifications.schedulePublished'),
      description: t('notifications.whenNewSchedules'),
      icon: <Bell className="w-4 h-4" />,
      priority: 'HIGH',
      defaultChannels: ['in_app', 'push', 'whatsapp']
    },
    {
      type: 'SWAP_REQUEST',
      title: t('notifications.swapRequests'),
      description: t('notifications.whenSomeoneRequestsSwap'),
      icon: <Volume2 className="w-4 h-4" />,
      priority: 'URGENT',
      defaultChannels: ['in_app', 'push', 'whatsapp']
    },
    {
      type: 'SWAP_APPROVED',
      title: t('swaps.swapApproved'),
      description: t('notifications.whenSwapRequestApproved'),
      icon: <CheckCircle className="w-4 h-4" />,
      priority: 'HIGH',
      defaultChannels: ['in_app', 'push']
    },
    {
      type: 'SWAP_DENIED',
      title: t('swaps.swapDenied'),
      description: t('notifications.whenSwapRequestDenied'),
      icon: <AlertCircle className="w-4 h-4" />,
      priority: 'MEDIUM',
      defaultChannels: ['in_app', 'push']
    },
    {
      type: 'SCHEDULE_CHANGE',
      title: t('notifications.scheduleChanges'),
      description: t('notifications.whenYourSchedule'),
      icon: <Bell className="w-4 h-4" />,
      priority: 'HIGH',
      defaultChannels: ['in_app', 'push', 'whatsapp']
    },
    {
      type: 'SHIFT_REMINDER',
      title: t('notifications.shiftReminders'),
      description: t('notifications.remindersBeforeShifts'),
      icon: <Bell className="w-4 h-4" />,
      priority: 'MEDIUM',
      defaultChannels: ['in_app', 'push']
    },
    {
      type: 'EMERGENCY_COVERAGE',
      title: t('notifications.emergencyCoverage'),
      description: t('notifications.urgentCoverageRequests'),
      icon: <AlertCircle className="w-4 h-4" />,
      priority: 'CRITICAL',
      defaultChannels: ['in_app', 'push', 'whatsapp']
    },
    {
      type: 'SWAP_ASSIGNMENT',
      title: t('notifications.swapAssignments'),
      description: t('notifications.whenAssignedToCoverShift'),
      icon: <Volume2 className="w-4 h-4" />,
      priority: 'HIGH',
      defaultChannels: ['in_app', 'push', 'whatsapp']
    }
  ]

  // Define loadPreferences with useCallback
  const loadPreferences = useCallback(async () => {
    if (!apiClient) return

    setLoading(true)
    try {
      const data = await apiClient.getNotificationPreferences()
      setPreferences(data || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast.error(t('notifications.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [apiClient, t])

  // load push stats
  useEffect(() => {
  const loadPushStats = async () => {
    if (!apiClient) return;

    try {
      const stats = await apiClient.getPushStats();
      setPushStats(stats);
    } catch (error) {
      console.error('Failed to load push stats:', error);
    }
  };

  loadPushStats();
}, [apiClient]);

  // Load current preferences
  useEffect(() => {
    loadPreferences()
    if (user?.whatsapp_number) {
      setWhatsappNumber(user.whatsapp_number)
      setTempWhatsappNumber(user.whatsapp_number)
    }
  }, [user, loadPreferences])

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
        toast.error(t('notifications.enableNotifications'))
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

      toast.success(t('common.updatedSuccessfully'))
    } catch (error) {
      console.error('Failed to update preference:', error)
      toast.error(t('common.failedToUpdate'))
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
      toast.success(t('notifications.whatsappNumberUpdated'))
    } catch (error) {
      console.error('Failed to update WhatsApp number:', error)
      toast.error(t('notifications.failedToUpdateWhatsapp'))
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
      toast.success(t('notifications.notificationsEnabled'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">{t('notifications.loadingSettings')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {t('notifications.notificationSettings')}
        </h2>
        <p className="text-muted-foreground">
          {t('notifications.manageHowAndWhenReceive')}
        </p>
      </div>

      {/* Push Notification Status */}
      {isPushSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              {t('notifications.pushNotifications')}
            </CardTitle>
            <CardDescription>
              {t('notifications.receiveNotificationsEvenWhenClosed')}
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
                        <span className="font-medium text-green-700">{t('common.enabled')}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-orange-700">{t('common.disabled')}</span>
                      </>
                    )}
                  </div>
                  {pushToken && (
                    <Badge variant="secondary" className="text-xs">{t('notifications.connected')}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasPushPermission 
                    ? t('notifications.youWillReceivePushNotifications')
                    : t('notifications.enableToGetNotificationsWhenClosed')
                  }
                </p>
              </div>
              {needsPushPermission && (
                <Button onClick={enablePushNotifications} size="sm">
                  {t('notifications.enablePushNotifications')}
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
            {t('notifications.whatsappNotifications')}
          </CardTitle>
          <CardDescription>
            {t('notifications.receiveImportantViaWhatsapp')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t('notifications.whatsappNumber')}</Label>
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
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notifications.includeCountryCode')}
            </p>
          </div>
          
          {whatsappNumber && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              {t('notifications.whatsappConfigured')} {whatsappNumber}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Type Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('notifications.notificationTypes')}
          </CardTitle>
          <CardDescription>
            {t('notifications.chooseHowToReceiveNotifications')}
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
                            {t(`common.${config.priority.toLowerCase()}`)}
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

                      {/* Push stats */}
                      {pushStats && (
                        <div className="text-sm text-gray-600 mt-2">
                          <p>{pushStats.active_devices} {t('common.of')} {pushStats.total_devices} {t('notifications.devicesHaveValidNotifications')}</p>
                          {pushStats.devices_needing_reauth > 0 && (
                            <p className="text-orange-600">
                              {pushStats.devices_needing_reauth} {t('notifications.devicesNeedReauth')}
                            </p>
                          )}
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
            <h5 className="font-medium mb-3">{t('notifications.channelTypes')}</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{t('notifications.inApp')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-500" />
                <span>{t('notifications.push')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500" />
                <span>{t('common.email')}</span>
              </div>
            </div>
            {!whatsappNumber && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('notifications.setWhatsappNumberToEnable')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}