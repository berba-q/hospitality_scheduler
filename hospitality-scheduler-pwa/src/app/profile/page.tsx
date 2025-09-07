// src/app/profile/page.tsx - TRANSLATED VERSION
'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Camera, 
  Upload, 
  Save, 
  ArrowLeft, 
  Phone, 
  Globe, 
  Palette, 
  Bell, 
  Shield, 
  Monitor,
  Moon,
  Sun,
  Settings,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/hooks/useApi'
import AccountLinking from '@/components/auth/account-linking'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import Image from 'next/image'

const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
]

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('personal')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const {
    userProfile,
    loading,
    saving,
    hasUnsavedChanges,
    updateUserProfile,
    saveUserProfile,
    uploadAvatar,
    updateAvatarSettings
  } = useSettings()

  // Theme options with translations
  const THEMES = [
    { value: 'system', label: t('profile.systemTheme'), icon: Monitor },
    { value: 'light', label: t('profile.lightTheme'), icon: Sun },
    { value: 'dark', label: t('profile.darkTheme'), icon: Moon }
  ]

  // Languages - keeping native names as is standard practice
  const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' }
  ]

  // Standard timezone and currency lists
  const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ]

  const CURRENCIES = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'JPY', label: 'JPY - Japanese Yen' }
  ]

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.pleaseSelectValidImageFile'))
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error(t('profile.fileSizeMustBeLessThan5mb'))
      return
    }

    setUploading(true)
    try {
      await uploadAvatar(file)
      toast.success(t('profile.avatarUploadedSuccessfully'))
    } catch (error) {
      console.error('Avatar upload failed:', error)
      toast.error(t('profile.failedToUpdateProfile'))
    } finally {
      setUploading(false)
    }
  }, [uploadAvatar, t])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAvatarUpload(file)
    }
  }, [handleAvatarUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleAvatarUpload(file)
    }
  }, [handleAvatarUpload])

  const handleAvatarTypeChange = useCallback(async (type: 'initials' | 'uploaded' | 'gravatar') => {
    try {
      await updateAvatarSettings({ avatar_type: type })
      toast.success(t('profile.avatarSettingsUpdated'))
    } catch (error) {
      console.error('Failed to update avatar type:', error)
      toast.error(t('profile.failedToUpdateAvatarSettings'))
    }
  }, [updateAvatarSettings, t])

  const handleAvatarColorChange = useCallback(async (color: string) => {
    try {
      await updateAvatarSettings({ 
        avatar_type: (userProfile?.avatar_type as 'initials' | 'uploaded' | 'gravatar') || 'initials',
        avatar_color: color 
      })
      toast.success(t('profile.avatarSettingsUpdated'))
    } catch (error) {
      console.error('Failed to update avatar color:', error)
      toast.error(t('profile.failedToUpdateAvatarSettings'))
    }
  }, [updateAvatarSettings, userProfile?.avatar_type, t])

  const handleSaveProfile = useCallback(async () => {
    try {
      await saveUserProfile()
      toast.success(t('profile.profileUpdatedSuccessfully'))
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error(t('profile.failedToUpdateProfile'))
    }
  }, [saveUserProfile, t])

  const getAvatarDisplay = () => {
    if (userProfile?.avatar_type === 'uploaded' && userProfile?.avatar_url) {
      return (
        <Image 
            src={userProfile.avatar_url} 
            alt={t('profile.avatarPreview')}
            width={128}
            height={128}
            className="w-full h-full object-cover"
            unoptimized={true}
        />
      )
    }
    
    if (userProfile?.avatar_type === 'gravatar') {
      const email = user?.email || ''
      const hash = btoa(email.toLowerCase().trim()).replace(/[+/]/g, '').slice(0, 32)
      const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=200&d=mp`
      return (
        <Image 
            src={gravatarUrl} 
            alt={t('profile.gravatar')}
            width={128}
            height={128}
            className="w-full h-full object-cover"
            unoptimized={true}
        />
        )
    }
    
    // Initials avatar
    const initials = (userProfile?.display_name || user?.email || '')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return (
      <div 
        className="w-full h-full flex items-center justify-center text-white font-bold text-4xl"
        style={{ backgroundColor: userProfile?.avatar_color || '#3B82F6' }}
      >
        {initials}
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('profile.loadingProfile')}</p>
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
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                {t('profile.myProfile')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('profile.managePersonalInformation')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('common.unsavedChanges')}
                </Badge>
              )}
              
              <Button
                onClick={() => router.push('/settings')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('settings.systemSettings')}
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Quick Save */}
          {hasUnsavedChanges && (
            <Alert className="mb-6">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{t('common.unsavedChanges')}</span>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  size="sm"
                  className="ml-4"
                >
                  {saving ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('profile.personalTab')}
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {t('profile.avatarTab')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {t('profile.preferencesTab')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('profile.notificationsTab')}
            </TabsTrigger>
            <TabsTrigger value="linked-accounts" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('profile.linkAccounts')}
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('profile.basicInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="display_name">{t('profile.displayName')}</Label>
                    <Input
                      id="display_name"
                      value={userProfile?.display_name || ''}
                      onChange={(e) => updateUserProfile({ display_name: e.target.value })}
                      placeholder={t('profile.displayNamePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">{t('profile.bio')}</Label>
                    <Textarea
                      id="bio"
                      value={userProfile?.bio || ''}
                      onChange={(e) => updateUserProfile({ bio: e.target.value })}
                      placeholder={t('profile.bioPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="title">{t('profile.jobTitle')}</Label>
                    <Input
                      id="title"
                      value={userProfile?.title || ''}
                      onChange={(e) => updateUserProfile({ title: e.target.value })}
                      placeholder={t('profile.jobTitlePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">{t('profile.department')}</Label>
                    <Input
                      id="department"
                      value={userProfile?.department || ''}
                      onChange={(e) => updateUserProfile({ department: e.target.value })}
                      placeholder={t('profile.departmentPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    {t('profile.contactInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">{t('profile.emailAddress')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {t('profile.emailCannotBeChanged')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone_number">{t('profile.phoneNumber')}</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={userProfile?.phone_number || ''}
                      onChange={(e) => updateUserProfile({ phone_number: e.target.value })}
                      placeholder={t('profile.phoneNumberPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('profile.savePersonalInformation')}
              </Button>
            </div>
          </TabsContent>

          {/* Avatar Tab */}
          <TabsContent value="avatar" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Avatar Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {t('profile.avatarPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                      {getAvatarDisplay()}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        {t('profile.currentAvatarType')} <strong>{userProfile?.avatar_type || 'initials'}</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avatar Options */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.avatarOptions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Type Selection */}
                  <div>
                    <Label className="text-base font-medium">{t('profile.avatarType')}</Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          userProfile?.avatar_type === 'initials' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAvatarTypeChange('initials')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            AB
                          </div>
                          <div>
                            <p className="font-medium">{t('profile.initials')}</p>
                            <p className="text-sm text-gray-500">{t('profile.useInitialsAsAvatar')}</p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          userProfile?.avatar_type === 'gravatar' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAvatarTypeChange('gravatar')}
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-medium">{t('profile.gravatar')}</p>
                            <p className="text-sm text-gray-500">{t('profile.useGlobalGravatarImage')}</p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          userProfile?.avatar_type === 'uploaded' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAvatarTypeChange('uploaded')}
                      >
                        <div className="flex items-center gap-3">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-medium">{t('profile.customImage')}</p>
                            <p className="text-sm text-gray-500">{t('profile.uploadYourOwnPhoto')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Picker for Initials */}
                  {userProfile?.avatar_type === 'initials' && (
                    <div>
                      <Label className="text-base font-medium">{t('profile.avatarColor')}</Label>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {AVATAR_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              userProfile?.avatar_color === color
                                ? 'border-gray-800 scale-110'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleAvatarColorChange(color)}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Upload for Custom Image */}
                  {userProfile?.avatar_type === 'uploaded' && (
                    <div>
                      <Label className="text-base font-medium">{t('profile.uploadImage')}</Label>
                      <div
                        className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragOver 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        {uploading ? (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                            <p>{t('profile.uploading')}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {t('profile.clickToUpload')}
                              </button> {t('profile.orDragAndDrop')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('profile.pngJpgGifUpTo5mb')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    {t('profile.appearance')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">{t('profile.theme')}</Label>
                    <Select 
                      value={userProfile?.theme || 'system'} 
                      onValueChange={(value) => updateUserProfile({ theme: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((theme) => (
                          <SelectItem key={theme.value} value={theme.value}>
                            <div className="flex items-center gap-2">
                              <theme.icon className="w-4 h-4" />
                              {theme.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">{t('profile.language')}</Label>
                    <Select 
                      value={userProfile?.language || 'en'} 
                      onValueChange={(value) => updateUserProfile({ language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Regional Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    {t('profile.regionalSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timezone">{t('profile.timezone')}</Label>
                    <Select 
                      value={userProfile?.timezone || 'UTC'} 
                      onValueChange={(value) => updateUserProfile({ timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">{t('profile.currency')}</Label>
                    <Select 
                      value={userProfile?.currency || 'USD'} 
                      onValueChange={(value) => updateUserProfile({ currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date_format">{t('profile.dateFormat')}</Label>
                    <Select 
                      value={userProfile?.date_format || 'MM/dd/yyyy'} 
                      onValueChange={(value) => updateUserProfile({ date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">{t('profile.dateFormatUS')}</SelectItem>
                        <SelectItem value="dd/MM/yyyy">{t('profile.dateFormatEU')}</SelectItem>
                        <SelectItem value="yyyy-MM-dd">{t('profile.dateFormatISO')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time_format">{t('profile.timeFormat')}</Label>
                    <Select 
                      value={userProfile?.time_format || '12h'} 
                      onValueChange={(value) => updateUserProfile({ time_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">{t('profile.timeFormat12h')}</SelectItem>
                        <SelectItem value="24h">{t('profile.timeFormat24h')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('profile.savePreferences')}
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {t('profile.notificationPreferences')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_desktop_notifications">{t('profile.desktopNotifications')}</Label>
                    <p className="text-sm text-gray-500">{t('profile.showNotificationsInBrowser')}</p>
                  </div>
                  <Switch
                    id="enable_desktop_notifications"
                    checked={userProfile?.enable_desktop_notifications || false}
                    onCheckedChange={(checked) => updateUserProfile({ enable_desktop_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_sound_notifications">{t('profile.soundNotifications')}</Label>
                    <p className="text-sm text-gray-500">{t('profile.playSoundForImportantNotifications')}</p>
                  </div>
                  <Switch
                    id="enable_sound_notifications"
                    checked={userProfile?.enable_sound_notifications || false}
                    onCheckedChange={(checked) => updateUserProfile({ enable_sound_notifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet_hours_enabled">{t('profile.quietHours')}</Label>
                    <p className="text-sm text-gray-500">{t('profile.disableNotificationsDuringHours')}</p>
                  </div>
                  <Switch
                    id="quiet_hours_enabled"
                    checked={userProfile?.quiet_hours_enabled || false}
                    onCheckedChange={(checked) => updateUserProfile({ quiet_hours_enabled: checked })}
                  />
                </div>

                {userProfile?.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="quiet_hours_start">{t('profile.startTime')}</Label>
                      <Input
                        id="quiet_hours_start"
                        type="time"
                        value={userProfile?.quiet_hours_start || '22:00'}
                        onChange={(e) => updateUserProfile({ quiet_hours_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet_hours_end">{t('profile.endTime')}</Label>
                      <Input
                        id="quiet_hours_end"
                        type="time"
                        value={userProfile?.quiet_hours_end || '08:00'}
                        onChange={(e) => updateUserProfile({ quiet_hours_end: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weekend_notifications">{t('profile.weekendNotifications')}</Label>
                    <p className="text-sm text-gray-500">{t('profile.receiveNotificationsOnWeekends')}</p>
                  </div>
                  <Switch
                    id="weekend_notifications"
                    checked={userProfile?.weekend_notifications !== false}
                    onCheckedChange={(checked) => updateUserProfile({ weekend_notifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('profile.saveNotificationSettings')}
              </Button>
            </div>
          </TabsContent>

          {/* Linked Accounts Tab */}
          <TabsContent value="linked-accounts" className="space-y-6">
            <AccountLinking mode="management" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}