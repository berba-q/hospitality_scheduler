// src/app/settings/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Settings, 
  Bell, 
  Shield, 
  Database,
  Users,
  Smartphone,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  Lock,
  Monitor,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSettings } from '@/hooks/useSettings'
import { useTranslations } from '@/hooks/useTranslations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslations()
  const [activeTab, setActiveTab] = useState('system')
  
  // Use the settings hook
  const {
    systemSettings,
    notificationSettings,
    serviceStatus,  
    loading,
    saving,
    hasUnsavedChanges,
    updateSystemSettings,
    updateNotificationSettings,
    saveSystemSettings,
    saveNotificationSettings,
    resetToDefaults,         
    toggleNotificationService,  
    refreshServiceStatus,                  
    isFullyConfigured,
  } = useSettings()

  const handleSaveSystemSettings = async () => {
  try {
    await saveSystemSettings()
    toast.success(t('settings.systemSettingsSavedSuccessfully'))
  } catch (error) {
    toast.error(t('settings.failedToSaveSystemSettings'))
    console.error('Failed to save system settings:', error)
  }
}

const handleSaveNotificationSettings = async () => {
  try {
    await saveNotificationSettings()
    toast.success(t('settings.notificationSettingsSavedSuccessfully'))
  } catch (error) {
    toast.error(t('settings.failedToSaveNotificationSettings'))
    console.error('Failed to save notification settings:', error)
  }
}

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                {t('navigation.settings')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('settings.manageSystemConfiguration')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('settings.unsavedChanges')}
                </Badge>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(t('settings.resetToDefaultsConfirm'))) {
                    resetToDefaults()
                  }
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('settings.resetToDefaults')}
              </Button>
              
              <Button
                onClick={() => router.push('/profile')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {t('settings.myProfile')}
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              {t('settings.system')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('settings.notifications')}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('settings.security')}
            </TabsTrigger>
          </TabsList>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Company & Localization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    {t('settings.companyAndLocalization')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company_name">{t('settings.companyName')}</Label>
                    <Input
                      id="company_name"
                      value={systemSettings?.company_name || ''}
                      onChange={(e) => updateSystemSettings({ company_name: e.target.value })}
                      placeholder={t('settings.companyNamePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                    <Select 
                      value={systemSettings?.timezone || 'UTC'} 
                      onValueChange={(value) => updateSystemSettings({ timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.selectTimezone')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/Rome">{t('settings.europeRome')}</SelectItem>
                        <SelectItem value="Europe/London">{t('settings.europeLondon')}</SelectItem>
                        <SelectItem value="America/New_York">{t('settings.americaNewYork')}</SelectItem>
                        <SelectItem value="America/Los_Angeles">{t('settings.americaLosAngeles')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">{t('settings.currency')}</Label>
                    <Select 
                      value={systemSettings?.currency || 'EUR'} 
                      onValueChange={(value) => updateSystemSettings({ currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.selectCurrency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date_format">{t('settings.dateFormat')}</Label>
                    <Select 
                      value={systemSettings?.date_format || 'DD/MM/YYYY'} 
                      onValueChange={(value) => updateSystemSettings({ date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time_format">{t('settings.timeFormat')}</Label>
                    <Select 
                      value={systemSettings?.time_format || '24h'} 
                      onValueChange={(value) => updateSystemSettings({ time_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">{t('settings.format24h')}</SelectItem>
                        <SelectItem value="12h">{t('settings.format12h')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {t('settings.schedulingSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="default_shift_duration">{t('settings.defaultShiftDuration')}</Label>
                    <Select 
                      value={systemSettings?.default_shift_duration?.toString() || '8'} 
                      onValueChange={(value) => updateSystemSettings({ default_shift_duration: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">{t('settings.hours', { count: 4 })}</SelectItem>
                        <SelectItem value="6">{t('settings.hours', { count: 6 })}</SelectItem>
                        <SelectItem value="8">{t('settings.hours', { count: 8 })}</SelectItem>
                        <SelectItem value="10">{t('settings.hours', { count: 10 })}</SelectItem>
                        <SelectItem value="12">{t('settings.hours', { count: 12 })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="max_weekly_hours">{t('settings.defaultMaxWeeklyHours')}</Label>
                    <Input
                      id="max_weekly_hours"
                      type="number"
                      min="1"
                      max="168"
                      value={systemSettings?.max_weekly_hours || 40}
                      onChange={(e) => updateSystemSettings({ max_weekly_hours: parseInt(e.target.value) || 40 })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="conflict_check_enabled">{t('settings.conflictDetection')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.conflictDetectionDesc')}</p>
                    </div>
                    <Switch
                      id="conflict_check_enabled"
                      checked={systemSettings?.conflict_check_enabled || false}
                      onCheckedChange={(checked) => updateSystemSettings({ conflict_check_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="balance_workload">{t('settings.balanceWorkload')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.balanceWorkloadDesc')}</p>
                    </div>
                    <Switch
                      id="balance_workload"
                      checked={systemSettings?.balance_workload || false}
                      onCheckedChange={(checked) => updateSystemSettings({ balance_workload: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow_overtime">{t('settings.allowOvertime')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.allowOvertimeDesc')}</p>
                    </div>
                    <Switch
                      id="allow_overtime"
                      checked={systemSettings?.allow_overtime || false}
                      onCheckedChange={(checked) => updateSystemSettings({ allow_overtime: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSystemSettings}
                disabled={saving || !hasUnsavedChanges} // Disable when saving OR no changes
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.saving')}...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('common.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Settings Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid gap-6">
              {/* Notification Channels - Simplified */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    {t('settings.notificationChannels')}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {t('settings.chooseHowTeamReceivesNotifications')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="email_notifications" className="text-base font-medium">
                            {t('settings.emailNotifications')}
                          </Label>
                          {serviceStatus?.smtp.status === 'active' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('settings.active')}
                            </Badge>
                          )}
                          {serviceStatus?.smtp.status === 'setup_required' && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {t('settings.setupRequired')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {t('settings.sendNotificationsViaEmail')}
                        </p>
                      </div>
                    </div>
                    <Switch
                        id="email_notifications"
                        checked={serviceStatus?.smtp.enabled || false}
                        onCheckedChange={(checked) => toggleNotificationService('email', checked)}
                        disabled={!serviceStatus?.smtp.configured} 
                    />
                  </div>

                  {/* WhatsApp Notifications */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="whatsapp_notifications" className="text-base font-medium">
                            {t('settings.whatsappMessages')}
                          </Label>
                          {serviceStatus?.whatsapp.status === 'active' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('settings.active')}
                            </Badge>
                          )}
                          {serviceStatus?.whatsapp.status === 'setup_required' && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {t('settings.setupRequired')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {t('settings.sendUrgentNotificationsViaWhatsApp')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="whatsapp_notifications"
                      checked={serviceStatus?.whatsapp.enabled || false}
                      onCheckedChange={(checked) => toggleNotificationService('whatsapp', checked)}
                      disabled={!serviceStatus?.whatsapp.configured}
                    />
                  </div>

                  {/* Push Notifications */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="push_notifications" className="text-base font-medium">
                            {t('settings.pushNotifications')}
                          </Label>
                          {serviceStatus?.push.status === 'active' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('settings.active')}
                            </Badge>
                          )}
                          {serviceStatus?.push.status === 'setup_required' && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {t('settings.setupRequired')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {t('settings.sendInstantNotificationsToMobileDevices')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="push_notifications"
                      checked={serviceStatus?.push.enabled || false}
                      onCheckedChange={(checked) => toggleNotificationService('push', checked)}
                      disabled={!serviceStatus?.push.configured}
                    />
                  </div>

                  {/* Setup Alert */}
                  {(!serviceStatus?.smtp.configured || 
                    !serviceStatus?.whatsapp.configured || 
                    !serviceStatus?.push.configured) && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>{t('settings.setupRequired')}:</strong> {t('settings.contactSystemAdminToConfigureNotifications')}
                        <br />
                        <span className="text-sm mt-1 block">
                          {t('settings.servicesNeedingSetup')} {[
                            !serviceStatus?.smtp.configured && t('settings.emailService'),
                            !serviceStatus?.whatsapp.configured && t('settings.whatsappService'), 
                            !serviceStatus?.push.configured && t('settings.pushService')
                          ].filter(Boolean).join(', ')}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* ✅ NEW: Success Message */}
                  {isFullyConfigured && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>All Ready!</strong> All notification services are configured and ready to use.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* What Gets Notified - Using existing system settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {t('settings.notificationTypes')}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {t('settings.chooseWhatEventsTriggersNotifications')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="schedule_published_notify" className="text-sm font-medium">
                          {t('settings.schedulePublished')}
                        </Label>
                        <p className="text-sm text-gray-500">
                          {t('settings.notifyStaffWhenSchedulesPublished')}
                        </p>
                      </div>
                      <Switch
                        id="schedule_published_notify"
                        checked={systemSettings?.schedule_published_notify || false}
                        onCheckedChange={(checked) => updateSystemSettings({ schedule_published_notify: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="swap_request_notify" className="text-sm font-medium">
                          {t('settings.shiftSwapRequests')}
                        </Label>
                        <p className="text-sm text-gray-500">
                          {t('settings.notifyManagersAndStaffAboutSwapRequests')}
                        </p>
                      </div>
                      <Switch
                        id="swap_request_notify"
                        checked={systemSettings?.swap_request_notify || false}
                        onCheckedChange={(checked) => updateSystemSettings({ swap_request_notify: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="urgent_swap_notify" className="text-sm font-medium">
                          {t('settings.urgentCoverageNeeded')}
                        </Label>
                        <p className="text-sm text-gray-500">
                          {t('settings.immediateAlertsForEmergencyShiftCoverage')}
                        </p>
                      </div>
                      <Switch
                        id="urgent_swap_notify"
                        checked={systemSettings?.urgent_swap_notify || false}
                        onCheckedChange={(checked) => updateSystemSettings({ urgent_swap_notify: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="shift_reminder_notify" className="text-sm font-medium">
                          {t('settings.shiftReminders')}
                        </Label>
                        <p className="text-sm text-gray-500">
                          {t('settings.remindStaffAboutUpcomingShifts24hBefore')}
                        </p>
                      </div>
                      <Switch
                        id="shift_reminder_notify"
                        checked={systemSettings?.shift_reminder_notify || false}
                        onCheckedChange={(checked) => updateSystemSettings({ shift_reminder_notify: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="daily_reminder_notify" className="text-sm font-medium">
                          {t('settings.systemAlerts')}
                        </Label>
                        <p className="text-sm text-gray-500">
                          {t('settings.importantSystemUpdatesAndMaintenanceNotices')}
                        </p>
                      </div>
                      <Switch
                        id="daily_reminder_notify"
                        checked={systemSettings?.daily_reminder_notify || false}
                        onCheckedChange={(checked) => updateSystemSettings({ daily_reminder_notify: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Settings (Collapsed) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        {t('settings.technicalConfiguration')}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {t('settings.advancedSettingsForSystemAdministrators')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Optional: You can implement a way to contact admin or show more details
                        toast.info('Please contact your system administrator for technical configuration.')
                      }}
                    >
                      {t('settings.contactAdmin')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      {t('settings.technicalConfigurationRequiresAdminAccess')}
                      <br />
                      <strong>{t('settings.currentStatus')}:</strong>
                      <br />
                      • {t('settings.emailService')}: {notificationSettings?.smtp_enabled ? t('settings.configured') : t('settings.requiresSetup')}
                      <br />
                      • {t('settings.whatsappService')}: {notificationSettings?.whatsapp_enabled ? t('settings.configured') : t('settings.requiresSetup')}
                      <br />
                      • {t('settings.pushService')}: {notificationSettings?.push_enabled ? t('settings.configured') : t('settings.requiresSetup')}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={handleSaveNotificationSettings}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                    {t('common.saving')}...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('settings.saveNotificationSettings')}
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleSaveSystemSettings}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('common.saving')}...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('settings.saveSystemSettings')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Security Policies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    {t('settings.securityPolicies')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require_2fa">{t('settings.requireTwoFactor')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.requireTwoFactorDesc')}</p>
                    </div>
                    <Switch
                      id="require_2fa"
                      checked={systemSettings?.require_2fa || false}
                      onCheckedChange={(checked) => updateSystemSettings({ require_2fa: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="session_timeout">{t('settings.sessionTimeout')}</Label>
                    <Select 
                      value={systemSettings?.session_timeout?.toString() || '1440'} 
                      onValueChange={(value) => updateSystemSettings({ session_timeout: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{t('settings.minutes', { count: 30 })}</SelectItem>
                        <SelectItem value="60">{t('settings.hour', { count: 1 })}</SelectItem>
                        <SelectItem value="480">{t('settings.hours', { count: 8 })}</SelectItem>
                        <SelectItem value="1440">{t('settings.hours', { count: 24 })}</SelectItem>
                        <SelectItem value="10080">{t('settings.week', { count: 1 })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="password_min_length">{t('settings.minimumPasswordLength')}</Label>
                    <Input
                      id="password_min_length"
                      type="number"
                      min="6"
                      max="50"
                      value={systemSettings?.password_min_length || 8}
                      onChange={(e) => updateSystemSettings({ password_min_length: parseInt(e.target.value) || 8 })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require_password_complexity">{t('settings.requirePasswordComplexity')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.requirePasswordComplexityDesc')}</p>
                    </div>
                    <Switch
                      id="require_password_complexity"
                      checked={systemSettings?.require_password_complexity || false}
                      onCheckedChange={(checked) => updateSystemSettings({ require_password_complexity: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Audit & Logging */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    {t('settings.auditAndLogging')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audit_enabled">{t('settings.enableAuditLogging')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.enableAuditLoggingDesc')}</p>
                    </div>
                    <Switch
                      id="audit_enabled"
                      checked={systemSettings?.audit_enabled || false}
                      onCheckedChange={(checked) => updateSystemSettings({ audit_enabled: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="log_retention_days">{t('settings.logRetentionDays')}</Label>
                    <Select 
                      value={systemSettings?.log_retention_days?.toString() || '90'} 
                      onValueChange={(value) => updateSystemSettings({ log_retention_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{t('settings.days', { count: 30 })}</SelectItem>
                        <SelectItem value="90">{t('settings.days', { count: 90 })}</SelectItem>
                        <SelectItem value="180">{t('settings.days', { count: 180 })}</SelectItem>
                        <SelectItem value="365">{t('settings.year', { count: 1 })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="log_sensitive_data">{t('settings.logSensitiveData')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.logSensitiveDataDesc')}</p>
                    </div>
                    <Switch
                      id="log_sensitive_data"
                      checked={systemSettings?.log_sensitive_data || false}
                      onCheckedChange={(checked) => updateSystemSettings({ log_sensitive_data: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSystemSettings}
                disabled={saving || !hasUnsavedChanges} // Disable when saving OR no changes
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.saving')}...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('common.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}