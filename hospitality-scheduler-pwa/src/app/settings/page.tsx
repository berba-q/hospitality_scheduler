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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// No need for TypeScript interfaces - they're in the useSettings hook

export default function SettingsPage() {
  const router = useRouter()
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
              <p className="text-gray-600">Loading settings...</p>
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
                Settings
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your system configuration, notifications, and preferences
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    resetToDefaults()
                  }
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
              
              <Button
                onClick={() => router.push('/profile')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                My Profile
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
              System
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
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
                    Company & Localization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={systemSettings?.company_name || ''}
                      onChange={(e) => updateSystemSettings({ company_name: e.target.value })}
                      placeholder="Enter your company name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={systemSettings?.timezone || 'UTC'}
                      onValueChange={(value) => updateSystemSettings({ timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_format">Date Format</Label>
                      <Select
                        value={systemSettings?.date_format || 'MM/dd/yyyy'}
                        onValueChange={(value) => updateSystemSettings({ date_format: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                          <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                          <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={systemSettings?.currency || 'USD'}
                        onValueChange={(value) => updateSystemSettings({ currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Smart Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smart_scheduling_enabled">Enable Smart Scheduling</Label>
                      <p className="text-sm text-gray-500">Use AI to optimize schedule assignments</p>
                    </div>
                    <Switch
                      id="smart_scheduling_enabled"
                      checked={systemSettings?.smart_scheduling_enabled || false}
                      onCheckedChange={(checked) => updateSystemSettings({ smart_scheduling_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="conflict_check_enabled">Conflict Detection</Label>
                      <p className="text-sm text-gray-500">Check for scheduling conflicts</p>
                    </div>
                    <Switch
                      id="conflict_check_enabled"
                      checked={systemSettings?.conflict_check_enabled || false}
                      onCheckedChange={(checked) => updateSystemSettings({ conflict_check_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="balance_workload">Balance Workload</Label>
                      <p className="text-sm text-gray-500">Distribute shifts evenly among staff</p>
                    </div>
                    <Switch
                      id="balance_workload"
                      checked={systemSettings?.balance_workload || false}
                      onCheckedChange={(checked) => updateSystemSettings({ balance_workload: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow_overtime">Allow Overtime</Label>
                      <p className="text-sm text-gray-500">Permit overtime scheduling</p>
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
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save System Settings
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Settings (SMTP)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smtp_enabled">Enable Email Notifications</Label>
                      <p className="text-sm text-gray-500">Send notifications via email</p>
                    </div>
                    <Switch
                      id="smtp_enabled"
                      checked={notificationSettings?.smtp_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ smtp_enabled: checked })}
                    />
                  </div>

                  {notificationSettings?.smtp_enabled && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label htmlFor="smtp_server">SMTP Server</Label>
                        <Input
                          id="smtp_server"
                          value={notificationSettings?.smtp_server || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_server: e.target.value })}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="smtp_port">Port</Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            value={notificationSettings?.smtp_port || 587}
                            onChange={(e) => updateNotificationSettings({ smtp_port: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_username">Username</Label>
                          <Input
                            id="smtp_username"
                            value={notificationSettings?.smtp_username || ''}
                            onChange={(e) => updateNotificationSettings({ smtp_username: e.target.value })}
                            placeholder="your-email@domain.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="smtp_password">Password</Label>
                        <Input
                          id="smtp_password"
                          type="password"
                          value={notificationSettings?.smtp_password || ''}
                          onChange={(e) => updateNotificationSettings({ smtp_password: e.target.value })}
                          placeholder="App password or SMTP password"
                        />
                      </div>

                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="smtp_use_tls"
                            checked={notificationSettings?.smtp_use_tls || false}
                            onCheckedChange={(checked) => updateNotificationSettings({ smtp_use_tls: checked })}
                          />
                          <Label htmlFor="smtp_use_tls">Use TLS</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="smtp_use_ssl"
                            checked={notificationSettings?.smtp_use_ssl || false}
                            onCheckedChange={(checked) => updateNotificationSettings({ smtp_use_ssl: checked })}
                          />
                          <Label htmlFor="smtp_use_ssl">Use SSL</Label>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => testConnection('smtp')}
                        className="w-full flex items-center gap-2"
                      >
                        <TestTube2 className="w-4 h-4" />
                        Test SMTP Connection
                      </Button>

                      {testResults.smtp && (
                        <Alert className={testResults.smtp.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          <AlertDescription className={testResults.smtp.success ? 'text-green-800' : 'text-red-800'}>
                            {testResults.smtp.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}
                            {testResults.smtp.message}
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
                    WhatsApp Settings (Twilio)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="whatsapp_enabled">Enable WhatsApp Notifications</Label>
                      <p className="text-sm text-gray-500">Send notifications via WhatsApp</p>
                    </div>
                    <Switch
                      id="whatsapp_enabled"
                      checked={notificationSettings?.whatsapp_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ whatsapp_enabled: checked })}
                    />
                  </div>

                  {notificationSettings?.whatsapp_enabled && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
                        <Input
                          id="twilio_account_sid"
                          value={notificationSettings?.twilio_account_sid || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_account_sid: e.target.value })}
                          placeholder="AC..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="twilio_auth_token">Twilio Auth Token</Label>
                        <Input
                          id="twilio_auth_token"
                          type="password"
                          value={notificationSettings?.twilio_auth_token || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_auth_token: e.target.value })}
                          placeholder="Your Twilio auth token"
                        />
                      </div>

                      <div>
                        <Label htmlFor="twilio_whatsapp_number">WhatsApp Number</Label>
                        <Input
                          id="twilio_whatsapp_number"
                          value={notificationSettings?.twilio_whatsapp_number || ''}
                          onChange={(e) => updateNotificationSettings({ twilio_whatsapp_number: e.target.value })}
                          placeholder="whatsapp:+1234567890"
                        />
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => testConnection('twilio')}
                        className="w-full flex items-center gap-2"
                      >
                        <TestTube2 className="w-4 h-4" />
                        Test WhatsApp Connection
                      </Button>

                      {testResults.twilio && (
                        <Alert className={testResults.twilio.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          <AlertDescription className={testResults.twilio.success ? 'text-green-800' : 'text-red-800'}>
                            {testResults.twilio.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}
                            {testResults.twilio.message}
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
                    Push Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push_enabled">Enable Push Notifications</Label>
                      <p className="text-sm text-gray-500">Send browser and mobile push notifications</p>
                    </div>
                    <Switch
                      id="push_enabled"
                      checked={notificationSettings?.push_enabled || false}
                      onCheckedChange={(checked) => updateNotificationSettings({ push_enabled: checked })}
                    />
                  </div>

                  {notificationSettings?.push_enabled && (
                    <Alert>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Push notifications require Firebase configuration. Contact your administrator to set up Firebase credentials.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Default Notification Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Default Notification Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="schedule_published_notify">Schedule Published</Label>
                      <p className="text-sm text-gray-500">Notify when schedules are published</p>
                    </div>
                    <Switch
                      id="schedule_published_notify"
                      checked={systemSettings?.schedule_published_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ schedule_published_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="swap_request_notify">Swap Requests</Label>
                      <p className="text-sm text-gray-500">Notify about shift swap requests</p>
                    </div>
                    <Switch
                      id="swap_request_notify"
                      checked={systemSettings?.swap_request_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ swap_request_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="urgent_swap_notify">Urgent Swaps</Label>
                      <p className="text-sm text-gray-500">Notify about urgent swap requests</p>
                    </div>
                    <Switch
                      id="urgent_swap_notify"
                      checked={systemSettings?.urgent_swap_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ urgent_swap_notify: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="daily_reminder_notify">Daily Reminders</Label>
                      <p className="text-sm text-gray-500">Send daily shift reminders</p>
                    </div>
                    <Switch
                      id="daily_reminder_notify"
                      checked={systemSettings?.daily_reminder_notify || false}
                      onCheckedChange={(checked) => updateSystemSettings({ daily_reminder_notify: checked })}
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
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Notification Settings
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Authentication & Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="session_timeout_hours">Session Timeout (hours)</Label>
                    <Input
                      id="session_timeout_hours"
                      type="number"
                      min="1"
                      max="168"
                      value={systemSettings?.session_timeout_hours || 24}
                      onChange={(e) => updateSystemSettings({ session_timeout_hours: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500 mt-1">How long users stay logged in (1-168 hours)</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require_two_factor">Require Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Require 2FA for all users</p>
                    </div>
                    <Switch
                      id="require_two_factor"
                      checked={systemSettings?.require_two_factor || false}
                      onCheckedChange={(checked) => updateSystemSettings({ require_two_factor: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enforce_strong_passwords">Enforce Strong Passwords</Label>
                      <p className="text-sm text-gray-500">Require complex passwords</p>
                    </div>
                    <Switch
                      id="enforce_strong_passwords"
                      checked={systemSettings?.enforce_strong_passwords || false}
                      onCheckedChange={(checked) => updateSystemSettings({ enforce_strong_passwords: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Social Login */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Social Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow_google_auth">Allow Google Sign-In</Label>
                      <p className="text-sm text-gray-500">Enable Google OAuth login</p>
                    </div>
                    <Switch
                      id="allow_google_auth"
                      checked={systemSettings?.allow_google_auth || false}
                      onCheckedChange={(checked) => updateSystemSettings({ allow_google_auth: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow_apple_auth">Allow Apple Sign-In</Label>
                      <p className="text-sm text-gray-500">Enable Apple OAuth login</p>
                    </div>
                    <Switch
                      id="allow_apple_auth"
                      checked={systemSettings?.allow_apple_auth || false}
                      onCheckedChange={(checked) => updateSystemSettings({ allow_apple_auth: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Analytics & Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Analytics & Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_usage_tracking">Enable Usage Analytics</Label>
                      <p className="text-sm text-gray-500">Track feature usage and patterns</p>
                    </div>
                    <Switch
                      id="enable_usage_tracking"
                      checked={systemSettings?.enable_usage_tracking || false}
                      onCheckedChange={(checked) => updateSystemSettings({ enable_usage_tracking: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable_performance_monitoring">Performance Monitoring</Label>
                      <p className="text-sm text-gray-500">Monitor system performance metrics</p>
                    </div>
                    <Switch
                      id="enable_performance_monitoring"
                      checked={systemSettings?.enable_performance_monitoring || false}
                      onCheckedChange={(checked) => updateSystemSettings({ enable_performance_monitoring: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="analytics_cache_ttl">Analytics Cache Duration (seconds)</Label>
                    <Input
                      id="analytics_cache_ttl"
                      type="number"
                      min="300"
                      max="86400"
                      value={systemSettings?.analytics_cache_ttl || 3600}
                      onChange={(e) => updateSystemSettings({ analytics_cache_ttl: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500 mt-1">How long to cache analytics data (5 min - 24 hours)</p>
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
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Security Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}