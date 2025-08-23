// src/hooks/useSettings.ts - COMPLETE UPDATED VERSION
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

// Default settings constants
const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  company_name: '',
  timezone: 'UTC',
  date_format: 'MM/dd/yyyy',
  currency: 'USD',
  language: 'en',
  smart_scheduling_enabled: true,
  max_optimization_iterations: 100,
  conflict_check_enabled: true,
  auto_assign_by_zone: false,
  balance_workload: true,
  require_manager_per_shift: false,
  allow_overtime: false,
  email_notifications_enabled: true,
  whatsapp_notifications_enabled: false,
  push_notifications_enabled: true,
  schedule_published_notify: true,
  swap_request_notify: true,
  urgent_swap_notify: true,
  daily_reminder_notify: false,
  session_timeout_hours: 24,
  require_two_factor: false,
  enforce_strong_passwords: true,
  allow_google_auth: true,
  allow_apple_auth: true,
  analytics_cache_ttl: 3600,
  enable_usage_tracking: true,
  enable_performance_monitoring: true
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  smtp_enabled: false,
  smtp_use_tls: true,
  smtp_use_ssl: false,
  whatsapp_enabled: false,
  push_enabled: false
}

// Types
interface SystemSettings {
  id?: string
  tenant_id?: string
  company_name: string
  timezone: string
  date_format: string
  currency: string
  language: string
  smart_scheduling_enabled: boolean
  max_optimization_iterations: number
  conflict_check_enabled: boolean
  auto_assign_by_zone: boolean
  balance_workload: boolean
  require_manager_per_shift: boolean
  allow_overtime: boolean
  email_notifications_enabled: boolean
  whatsapp_notifications_enabled: boolean
  push_notifications_enabled: boolean
  schedule_published_notify: boolean
  swap_request_notify: boolean
  urgent_swap_notify: boolean
  daily_reminder_notify: boolean
  session_timeout_hours: number
  require_two_factor: boolean
  enforce_strong_passwords: boolean
  allow_google_auth: boolean
  allow_apple_auth: boolean
  analytics_cache_ttl: number
  enable_usage_tracking: boolean
  enable_performance_monitoring: boolean
  created_at?: string
  updated_at?: string
}

interface NotificationSettings {
  id?: string
  tenant_id?: string
  smtp_enabled: boolean
  smtp_server?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_use_tls: boolean
  smtp_use_ssl: boolean
  whatsapp_enabled: boolean
  twilio_account_sid?: string
  twilio_auth_token?: string
  twilio_whatsapp_number?: string
  push_enabled: boolean
  firebase_config?: any
  created_at?: string
  updated_at?: string
}

// ✅ FIXED UserProfile interface with all missing fields
interface UserProfile {
  id?: string
  user_id?: string
  
  // Personal Information
  display_name?: string  
  bio?: string           
  title?: string        
  department?: string    
  phone_number?: string  
  
  // Avatar & Profile Picture
  avatar_url?: string
  avatar_type: string
  avatar_color: string
  
  // Contact Information
  whatsapp_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  preferred_name?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  
  // UI/UX Preferences
  timezone?: string
  language?: string
  theme?: string
  date_format?: string    
  time_format?: string    
  currency?: string      
  
  // Dashboard & Layout 
  dashboard_layout?: Record<string, any>  
  sidebar_collapsed?: boolean             
  cards_per_row?: number                  
  show_welcome_tour?: boolean             
  
  // Notification Preferences 
  notifications_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  whatsapp_notifications: boolean
  notification_sound: boolean
  notification_vibration: boolean

  // Advanced Notification Settings
  enable_desktop_notifications?: boolean
  enable_sound_notifications?: boolean
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  weekend_notifications?: boolean
  
  // Privacy & Security  
  privacy_level: string
  profile_visibility?: string             
  show_email?: boolean                    
  show_phone?: boolean                     
  show_online_status?: boolean          
  two_factor_enabled: boolean
  login_alerts: boolean
  data_sharing_consent: boolean
  marketing_emails: boolean
  
  // Work Preferences (NEW - from backend model)
  preferred_shifts?: string[]             
  max_consecutive_days?: number           
  preferred_days_off?: number[]           
  
  // App Settings (NEW - from backend model)
  auto_accept_swaps?: boolean            
  show_analytics?: boolean               
  
  // Onboarding (NEW - from backend model)
  onboarding_completed?: boolean          
  onboarding_step?: number                
  last_help_viewed?: string              
  feature_hints_enabled?: boolean         
  
  // Audit fields
  created_at?: string
  updated_at?: string
  last_active?: string
}

interface TestResult {
  service: string
  success: boolean
  message: string
  details: Record<string, any>
  tested_at: string
}

interface SettingsState {
  systemSettings: SystemSettings | null
  notificationSettings: NotificationSettings | null
  userProfile: UserProfile | null
  loading: boolean
  saving: boolean
  hasUnsavedChanges: boolean
  testResults: Record<string, TestResult>
}

export function useSettings() {
  const apiClient = useApiClient()
  
  // Early return if apiClient is not available
  const isReady = apiClient !== null
  
  const [state, setState] = useState<SettingsState>({
    systemSettings: null,
    notificationSettings: null,
    userProfile: null,
    loading: false,
    saving: false,
    hasUnsavedChanges: false,
    testResults: {}
  })

  // Load all settings
  const loadSettings = useCallback(async () => {
    if (!apiClient) {
      console.warn('API client not ready, skipping settings load')
      return
    }
    
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const [systemResponse, notificationResponse, profileResponse] = await Promise.allSettled([
        apiClient.getSystemSettings(),
        apiClient.getNotificationSettings(),
        apiClient.getMyProfile()
      ])

      setState(prev => ({
        ...prev,
        systemSettings: systemResponse.status === 'fulfilled' ? (systemResponse.value ?? DEFAULT_SYSTEM_SETTINGS) : DEFAULT_SYSTEM_SETTINGS,
        notificationSettings: notificationResponse.status === 'fulfilled' ? (notificationResponse.value ?? DEFAULT_NOTIFICATION_SETTINGS) : DEFAULT_NOTIFICATION_SETTINGS,
        userProfile: profileResponse.status === 'fulfilled' ? profileResponse.value : null,
        loading: false,
        hasUnsavedChanges: false
      }))

      // Log any errors without throwing
      if (systemResponse.status === 'rejected') {
        console.warn('Failed to load system settings:', systemResponse.reason)
      }
      if (notificationResponse.status === 'rejected') {
        console.warn('Failed to load notification settings:', notificationResponse.reason)
      }
      if (profileResponse.status === 'rejected') {
        console.warn('Failed to load user profile:', profileResponse.reason)
      }

    } catch (error) {
      console.error('Error loading settings:', error)
      setState(prev => ({ ...prev, loading: false }))
      toast.error('Failed to load settings')
    }
  }, [apiClient])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Update system settings locally
  const updateSystemSettings = useCallback((updates: Partial<SystemSettings>) => {
    setState(prev => ({
      ...prev,
      systemSettings: { ...(prev.systemSettings ?? DEFAULT_SYSTEM_SETTINGS), ...updates },
      hasUnsavedChanges: true
    }))
  }, [])

  // Update notification settings locally
  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setState(prev => ({
      ...prev,
      notificationSettings: { ...(prev.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS), ...updates },
      hasUnsavedChanges: true
    }))
  }, [])

  // Update user profile locally
  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      userProfile: prev.userProfile ? { ...prev.userProfile, ...updates } : null,
      hasUnsavedChanges: true
    }))
  }, [])

  // Save system settings with correct response handling
  const saveSystemSettings = useCallback(async () => {
    if (!apiClient || !state.systemSettings) return

    setState(prev => ({ ...prev, saving: true }))
    
    try {
      const method = state.systemSettings.id ? 'updateSystemSettings' : 'createSystemSettings'
      const response = await apiClient[method](state.systemSettings)
      
      setState(prev => ({
        ...prev,
        systemSettings: method === 'createSystemSettings' ? response : prev.systemSettings,
        saving: false,
        hasUnsavedChanges: false
      }))
      
      toast.success('System settings saved successfully!')
      return response
    } catch (error: any) {
      setState(prev => ({ ...prev, saving: false }))
      toast.error(error.response?.data?.detail || 'Failed to save system settings')
      throw error
    }
  }, [apiClient, state.systemSettings])

  // Save notification settings with resilient PUT-fallback logic
  const saveNotificationSettings = useCallback(async () => {
    if (!apiClient || !state.notificationSettings) return

    setState(prev => ({ ...prev, saving: true }))

    try {
      const body = state.notificationSettings
      let saved: any

      // If record has an id, update directly
      if ((body as any).id) {
        saved = await apiClient.updateNotificationSettings(body)
      } else {
        try {
          // Try create first
          saved = await apiClient.createNotificationSettings(body)
        } catch (e: any) {
          const status = e?.response?.status
          // If backend reports resource already exists, retry with PUT
          if (status === 400 || status === 409) {
            saved = await apiClient.updateNotificationSettings(body)
          } else {
            throw e
          }
        }
      }

      setState(prev => ({
        ...prev,
        notificationSettings: saved ?? body,
        saving: false,
        hasUnsavedChanges: false
      }))

      toast.success('Notification settings saved successfully!')
      return saved ?? body
    } catch (error: any) {
      setState(prev => ({ ...prev, saving: false }))
      toast.error(error?.response?.data?.detail || 'Failed to save notification settings')
      throw error
    }
  }, [apiClient, state.notificationSettings])

  //Save user profile with correct response handling
  const saveUserProfile = useCallback(async () => {
    if (!apiClient) {
      toast.error('API client not ready')
      return
    }
    if (!state.userProfile) return

    setState(prev => ({ ...prev, saving: true }))
    
    try {
      const response = await apiClient.updateMyProfile(state.userProfile)
      
      setState(prev => ({
        ...prev,
        saving: false,
        hasUnsavedChanges: false
      }))
      
      toast.success('Profile updated successfully!')
      return response
    } catch (error: any) {
      setState(prev => ({ ...prev, saving: false }))
      toast.error(error.response?.data?.detail || 'Failed to update profile')
      throw error
    }
  }, [apiClient, state.userProfile])

  // Test connection services
  const testConnection = useCallback(async (service: 'smtp' | 'twilio' | 'firebase') => {
    if (!apiClient) {
      toast.error('API client not ready')
      return
    }
    try {
      let response: TestResult
      
      switch (service) {
        case 'smtp':
          response = await apiClient.testSmtpConnection()
          break
        case 'twilio':
          response = await apiClient.testTwilioConnection()
          break
        case 'firebase':
          response = await apiClient.testFirebaseConnection()
          break
        default:
          throw new Error(`Unknown service: ${service}`)
      }
      
      setState(prev => ({
        ...prev,
        testResults: {
          ...prev.testResults,
          [service]: response
        }
      }))
      
      if (response.success) {
        toast.success(`${service.toUpperCase()} connection test successful!`)
      } else {
        toast.error(`${service.toUpperCase()} connection test failed: ${response.message}`)
      }
      
      return response
    } catch (error: any) {
      console.error(`Error testing ${service}:`, error)
      toast.error(`Failed to test ${service} connection`)
      throw error
    }
  }, [apiClient])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultSystemSettings = DEFAULT_SYSTEM_SETTINGS
    const defaultNotificationSettings = DEFAULT_NOTIFICATION_SETTINGS

    setState(prev => ({
      ...prev,
      systemSettings: defaultSystemSettings,
      notificationSettings: defaultNotificationSettings,
      hasUnsavedChanges: true
    }))
    
    toast.info('Settings reset to defaults. Remember to save your changes.')
  }, [])

  // Upload avatar with proper error handling
  const uploadAvatar = useCallback(async (file: File) => {
    if (!apiClient) {
      toast.error('API client not ready')
      return
    }
    setState(prev => ({ ...prev, saving: true }))
    
    try {
      const response = await apiClient.uploadAvatar(file)
      
      setState(prev => ({
        ...prev,
        userProfile: prev.userProfile ? {
          ...prev.userProfile,
          avatar_url: response.avatar_url,
          avatar_type: response.avatar_type,
          avatar_color: response.avatar_color
        } : null,
        saving: false
      }))
      
      toast.success('Avatar uploaded successfully!')
      return response
    } catch (error: any) {
      setState(prev => ({ ...prev, saving: false }))
      toast.error(error.response?.data?.detail || 'Failed to upload avatar')
      throw error
    }
  }, [apiClient])

  // Avatar type validation
type AvatarType = 'initials' | 'uploaded' | 'gravatar'

const isValidAvatarType = (type: string): type is AvatarType => {
  return ['initials', 'uploaded', 'gravatar'].includes(type)
}

// Update avatar settings with proper type validation
const updateAvatarSettings = useCallback(async (settings: {
  avatar_type: string
  avatar_color?: string
}) => {
  if (!apiClient) {
    toast.error('API client not ready')
    return
  }

  // Validate avatar type before calling API
  if (!isValidAvatarType(settings.avatar_type)) {
    toast.error('Invalid avatar type')
    return
  }

  setState(prev => ({ ...prev, saving: true }))
  
  try {
    // Cast to the expected type after validation
    const response = await apiClient.updateAvatarSettings({
      avatar_type: settings.avatar_type as AvatarType,
      avatar_color: settings.avatar_color
    })
    
    setState(prev => ({
      ...prev,
      userProfile: prev.userProfile ? {
        ...prev.userProfile,
        avatar_url: response.avatar_url,
        avatar_type: response.avatar_type,
        avatar_color: response.avatar_color
      } : null,
      saving: false
    }))
    
    toast.success('Avatar settings updated!')
    return response
  } catch (error: any) {
    setState(prev => ({ ...prev, saving: false }))
    toast.error(error.response?.data?.detail || 'Failed to update avatar')
    throw error
  }
}, [apiClient, isValidAvatarType])

  // Export settings
  const exportSettings = useCallback(async (options?: {
    include_system_settings?: boolean
    include_notification_settings?: boolean
    include_user_defaults?: boolean
    include_sensitive_data?: boolean
    export_format?: 'json' | 'yaml'
  }) => {
    if (!apiClient) {
      toast.error('API client not ready')
      return
    }
    try {
      const blob = await apiClient.exportSettings(options)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `settings-export-${new Date().toISOString().split('T')[0]}.${options?.export_format || 'json'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Settings exported successfully!')
      return blob
    } catch (error: any) {
      console.error('Error exporting settings:', error)
      toast.error('Failed to export settings')
      throw error
    }
  }, [apiClient])

  return {
    // State
    ...state,
    
    // Actions
    loadSettings,
    updateSystemSettings,
    updateNotificationSettings,
    updateUserProfile,
    saveSystemSettings,
    saveNotificationSettings,
    saveUserProfile,
    testConnection,
    resetToDefaults,
    uploadAvatar,
    updateAvatarSettings,
    exportSettings,
    
    // Computed values
    isLoaded: !state.loading && (state.systemSettings !== null || state.notificationSettings !== null || state.userProfile !== null),
    canSave: state.hasUnsavedChanges && !state.saving,
    
    // Helper methods
    clearUnsavedChanges: () => setState(prev => ({ ...prev, hasUnsavedChanges: false })),
    clearTestResults: () => setState(prev => ({ ...prev, testResults: {} }))
  }
}