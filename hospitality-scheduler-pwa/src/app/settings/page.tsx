// src/app/settings/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Palette,
  Monitor,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  TestTube2,
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
    loading,
    saving,
    hasUnsavedChanges,
    testResults,
    updateSystemSettings,
    updateNotificationSettings,
    saveSystemSettings,
    saveNotificationSettings,
    testConnection,
    resetToDefaults
  } = useSettings()

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('common.loading')}...</p>
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
                onClick={saveSystemSettings} 
                disabled={saving}
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
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    {t('settings.emailSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_enabled">{t('settings.sendEmailNotifications')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.sendEmailNotificationsDesc')}</p>
                    </div>
                    <Switch
                      id="email_enabled"
                      checked={notificationSettings?.email_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ email_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_pdf_attachment">{t('settings.sendEmailNotificationsWithPDF')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.sendEmailNotificationsWithPDFDesc')}</p>
                    </div>
                    <Switch
                      id="email_pdf_attachment"
                      checked={notificationSettings?.email_pdf_attachment || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ email_pdf_attachment: checked })}
                    />
                  </div>

                  {notificationSettings?.email_enabled && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="smtp_server">{t('settings.smtpServer')}</Label>
                        <Input
                          id="smtp_server"
                          value={notificationSettings?.smtp_server || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_server: e.target.value })}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_port">{t('settings.smtpPort')}</Label>
                        <Input
                          id="smtp_port"
                          type="number"
                          value={notificationSettings?.smtp_port || 587}
                          onChange={(e) => updateNotificationSettings({ smtp_port: parseInt(e.target.value) || 587 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_username">{t('settings.smtpUsername')}</Label>
                        <Input
                          id="smtp_username"
                          value={notificationSettings?.smtp_username || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_username: e.target.value })}
                          placeholder={t('settings.smtpUsernamePlaceholder')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_password">{t('settings.smtpPassword')}</Label>
                        <Input
                          id="smtp_password"
                          type="password"
                          value={notificationSettings?.smtp_password || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_password: e.target.value })}
                          placeholder={t('settings.smtpPasswordPlaceholder')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_from_email">{t('settings.fromEmail')}</Label>
                        <Input
                          id="smtp_from_email"
                          type="email"
                          value={notificationSettings?.smtp_from_email || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_from_email: e.target.value })}
                          placeholder={t('settings.fromEmailPlaceholder')}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => testConnection('email')}
                        className="flex items-center gap-2"
                      >
                        <TestTube2 className="w-4 h-4" />
                        {t('settings.testConnection')}
                      </Button>
                      {testResults?.email && (
                        <Alert className={testResults.email.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                          <AlertDescription className={testResults.email.success ? "text-green-800" : "text-red-800"}>
                            {testResults.email.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {t('settings.whatsappSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="whatsapp_enabled">{t('settings.sendWhatsappMessages')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.sendWhatsappMessagesDesc')}</p>
                    </div>
                    <Switch
                      id="whatsapp_enabled"
                      checked={notificationSettings?.whatsapp_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ whatsapp_enabled: checked })}
                    />
                  </div>

                  {notificationSettings?.whatsapp_enabled && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="twilio_account_sid">{t('settings.twilioAccountSid')}</Label>
                        <Input
                          id="twilio_account_sid"
                          value={notificationSettings?.twilio_account_sid || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_account_sid: e.target.value })}
                          placeholder="ACxxxxxxxxxx"
                        />
                      </div>
                      <div>
                        <Label htmlFor="twilio_auth_token">{t('settings.twilioAuthToken')}</Label>
                        <Input
                          id="twilio_auth_token"
                          type="password"
                          value={notificationSettings?.twilio_auth_token || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_auth_token: e.target.value })}
                          placeholder={t('settings.twilioAuthTokenPlaceholder')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="twilio_whatsapp_number">{t('settings.twilioWhatsappNumber')}</Label>
                        <Input
                          id="twilio_whatsapp_number"
                          value={notificationSettings?.twilio_whatsapp_number || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_whatsapp_number: e.target.value })}
                          placeholder="+14155238886"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => testConnection('whatsapp')}
                        className="flex items-center gap-2"
                      >
                        <TestTube2 className="w-4 h-4" />
                        {t('settings.testConnection')}
                      </Button>
                      {testResults?.whatsapp && (
                        <Alert className={testResults.whatsapp.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                          <AlertDescription className={testResults.whatsapp.success ? "text-green-800" : "text-red-800"}>
                            {testResults.whatsapp.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Push Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    {t('settings.pushNotifications')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push_enabled">{t('settings.sendPushNotifications')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.sendPushNotificationsDesc')}</p>
                    </div>
                    <Switch
                      id="push_enabled"
                      checked={notificationSettings?.push_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ push_enabled: checked })}
                    />
                  </div>

                  {notificationSettings?.push_enabled && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="firebase_server_key">{t('settings.firebaseServerKey')}</Label>
                        <Input
                          id="firebase_server_key"
                          type="password"
                          value={notificationSettings?.firebase_server_key || ''}
                          onChange={(e) => updateNotificationSettings({ firebase_server_key: e.target.value })}
                          placeholder={t('settings.firebaseServerKeyPlaceholder')}
                        />
                      </div>
                      {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            {t('settings.firebaseCredentialsRequired')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Default Notification Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    {t('settings.defaultNotificationTypes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="schedule_published_notify">{t('settings.schedulePublished')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.schedulePublishedDesc')}</p>
                    </div>
                    <Switch
                      id="schedule_published_notify"
                      checked={systemSettings?.schedule_published_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ schedule_published_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="swap_request_notify">{t('settings.swapRequests')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.swapRequestsDesc')}</p>
                    </div>
                    <Switch
                      id="swap_request_notify"
                      checked={systemSettings?.swap_request_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ swap_request_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="urgent_swap_notify">{t('settings.urgentSwaps')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.urgentSwapsDesc')}</p>
                    </div>
                    <Switch
                      id="urgent_swap_notify"
                      checked={systemSettings?.urgent_swap_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ urgent_swap_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shift_reminder_notify">{t('settings.shiftReminders')}</Label>
                      <p className="text-sm text-gray-500">{t('settings.shiftRemindersDesc')}</p>
                    </div>
                    <Switch
                      id="shift_reminder_notify"
                      checked={systemSettings?.shift_reminder_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ shift_reminder_notify: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={saveNotificationSettings} 
                disabled={saving}
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
                onClick={saveSystemSettings} 
                disabled={saving}
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