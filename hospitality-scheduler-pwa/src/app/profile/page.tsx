// src/app/profile/page.tsx - FIXED VERSION
'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Camera, 
  Upload, 
  Save, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar, 
  Globe, 
  Palette, 
  Bell, 
  Shield, 
  Monitor,
  Moon,
  Sun,
  Settings,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
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
import { toast } from 'sonner'
import Image from 'next/image'

const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
]

const THEMES = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' }
]

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

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
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

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      await uploadAvatar(file)
      toast.success('Avatar uploaded successfully!')
    } catch (error) {
      console.error('Avatar upload failed:', error)
    } finally {
      setUploading(false)
    }
  }, [uploadAvatar])

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
    } catch (error) {
      console.error('Failed to update avatar type:', error)
    }
  }, [updateAvatarSettings])

  const handleAvatarColorChange = useCallback(async (color: string) => {
    try {
      await updateAvatarSettings({ 
        avatar_type: (userProfile?.avatar_type as 'initials' | 'uploaded' | 'gravatar') || 'initials',
        avatar_color: color 
      })
    } catch (error) {
      console.error('Failed to update avatar color:', error)
    }
  }, [updateAvatarSettings, userProfile?.avatar_type])

  const getAvatarDisplay = () => {
    if (userProfile?.avatar_type === 'uploaded' && userProfile?.avatar_url) {
      return (
        <Image 
            src={userProfile.avatar_url} 
            alt="Profile" 
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
            alt="Gravatar" 
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
              <p className="text-gray-600">Loading profile...</p>
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
              Back
            </Button>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                My Profile
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your personal information, preferences, and account settings
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
                onClick={() => router.push('/settings')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                System Settings
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Quick Save */}
          {hasUnsavedChanges && (
            <Alert className="mb-6">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>You have unsaved changes to your profile.</span>
                <Button 
                  onClick={saveUserProfile} 
                  disabled={saving}
                  size="sm"
                  className="ml-4"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
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
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={userProfile?.display_name || ''}
                      onChange={(e) => updateUserProfile({ display_name: e.target.value })}
                      placeholder="How you'd like to be called"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={userProfile?.bio || ''}
                      onChange={(e) => updateUserProfile({ bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={userProfile?.title || ''}
                      onChange={(e) => updateUserProfile({ title: e.target.value })}
                      placeholder="e.g., Front Desk Manager"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={userProfile?.department || ''}
                      onChange={(e) => updateUserProfile({ department: e.target.value })}
                      placeholder="e.g., Guest Services"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Email cannot be changed from this page
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={userProfile?.phone_number || ''}
                      onChange={(e) => updateUserProfile({ phone_number: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={saveUserProfile} 
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Personal Information
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
                    Avatar Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                      {getAvatarDisplay()}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Current avatar type: <strong>{userProfile?.avatar_type || 'initials'}</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avatar Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Type Selection */}
                  <div>
                    <Label className="text-base font-medium">Avatar Type</Label>
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
                            <p className="font-medium">Initials</p>
                            <p className="text-sm text-gray-500">Use your initials as avatar</p>
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
                            <p className="font-medium">Gravatar</p>
                            <p className="text-sm text-gray-500">Use your global Gravatar image</p>
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
                            <p className="font-medium">Custom Image</p>
                            <p className="text-sm text-gray-500">Upload your own photo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Picker for Initials */}
                  {userProfile?.avatar_type === 'initials' && (
                    <div>
                      <Label className="text-base font-medium">Avatar Color</Label>
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
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Upload for Custom Image */}
                  {userProfile?.avatar_type === 'uploaded' && (
                    <div>
                      <Label className="text-base font-medium">Upload Image</Label>
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
                            <p>Uploading...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Click to upload
                              </button> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, GIF up to 5MB
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
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
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
                    <Label htmlFor="language">Language</Label>
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
                    Regional Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
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
                    <Label htmlFor="currency">Currency</Label>
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
                    <Label htmlFor="date_format">Date Format</Label>
                    <Select 
                      value={userProfile?.date_format || 'MM/dd/yyyy'} 
                      onValueChange={(value) => updateUserProfile({ date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (EU)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (ISO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time_format">Time Format</Label>
                    <Select 
                      value={userProfile?.time_format || '12h'} 
                      onValueChange={(value) => updateUserProfile({ time_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={saveUserProfile} 
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Preferences
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_desktop_notifications">Desktop Notifications</Label>
                    <p className="text-sm text-gray-500">Show notifications in your browser</p>
                  </div>
                  <Switch
                    id="enable_desktop_notifications"
                    checked={userProfile?.enable_desktop_notifications || false}
                    onCheckedChange={(checked) => updateUserProfile({ enable_desktop_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_sound_notifications">Sound Notifications</Label>
                    <p className="text-sm text-gray-500">Play sound for important notifications</p>
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
                    <Label htmlFor="quiet_hours_enabled">Quiet Hours</Label>
                    <p className="text-sm text-gray-500">Disable notifications during specific hours</p>
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
                      <Label htmlFor="quiet_hours_start">Start Time</Label>
                      <Input
                        id="quiet_hours_start"
                        type="time"
                        value={userProfile?.quiet_hours_start || '22:00'}
                        onChange={(e) => updateUserProfile({ quiet_hours_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet_hours_end">End Time</Label>
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
                    <Label htmlFor="weekend_notifications">Weekend Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications on weekends</p>
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
                onClick={saveUserProfile} 
                disabled={saving || !hasUnsavedChanges}
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
        </Tabs>
      </div>
    </AppLayout>
  )
}