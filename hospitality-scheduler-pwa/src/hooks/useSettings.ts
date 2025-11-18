// src/hooks/useSettings.ts - COMPLETE UPDATED VERSION
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as ApiTypes from '@/types/api'

// Default settings constants
const DEFAULT_SYSTEM_SETTINGS: Partial<ApiTypes.SystemSettings> = {
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

const DEFAULT_NOTIFICATION_SETTINGS: Partial<ApiTypes.NotificationSettings> = {
  smtp_enabled: false,
  smtp_use_tls: true,
  smtp_use_ssl: false,
  whatsapp_enabled: false,
  push_enabled: false
}

// Avatar type validation (moved outside component to avoid re-creation)
type AvatarType = 'initials' | 'uploaded' | 'gravatar'

const isValidAvatarType = (type: string): type is AvatarType => {
  return ['initials', 'uploaded', 'gravatar'].includes(type)
}

interface SettingsState {
  systemSettings: ApiTypes.SystemSettings | null
  notificationSettings: ApiTypes.NotificationSettings | null
  userProfile: ApiTypes.UserProfile | null
  serviceStatus: ApiTypes.ServiceStatus | null
  loading: boolean
  saving: boolean
  hasUnsavedChanges: boolean
  testResults: Record<string, ApiTypes.ServiceTestResult>
}

export function useSettings() {
  const apiClient = useApiClient()

  const [state, setState] = useState<SettingsState>({
    systemSettings: null,
    notificationSettings: null,
    userProfile: null,
    serviceStatus: null,
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
      const [systemResponse, notificationResponse, profileResponse, serviceStatusResponse] = await Promise.allSettled([
        apiClient.getSystemSettings(),
        apiClient.getNotificationSettings(),
        apiClient.getMyProfile(),
        apiClient.getServiceStatus()
      ])

      setState(prev => ({
        ...prev,
        systemSettings: systemResponse.status === 'fulfilled' ? systemResponse.value : null,
        notificationSettings: notificationResponse.status === 'fulfilled' ? notificationResponse.value : null,
        userProfile: profileResponse.status === 'fulfilled' ? profileResponse.value : null,
        serviceStatus: serviceStatusResponse.status === 'fulfilled' ? serviceStatusResponse.value : null,
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
      if (serviceStatusResponse.status === 'rejected') {
      console.warn('Failed to load service status:', serviceStatusResponse.reason)
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
  const updateSystemSettings = useCallback((updates: Partial<ApiTypes.SystemSettings>) => {
    setState(prev => ({
      ...prev,
      systemSettings: prev.systemSettings ? { ...prev.systemSettings, ...updates } : null,
      hasUnsavedChanges: true
    }))
  }, [])

  // Update notification settings locally
  const updateNotificationSettings = useCallback((updates: Partial<ApiTypes.NotificationSettings>) => {
    setState(prev => ({
      ...prev,
      notificationSettings: prev.notificationSettings ? { ...prev.notificationSettings, ...updates } : null,
      hasUnsavedChanges: true
    }))
  }, [])

  // Update user profile locally
  const updateUserProfile = useCallback((updates: Partial<ApiTypes.UserProfile>) => {
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setState(prev => ({ ...prev, saving: false }))
      toast.error(err.response?.data?.detail || 'Failed to save system settings')
      throw error
    }
  }, [apiClient, state.systemSettings])

  // Save notification settings with resilient PUT-fallback logic
  const saveNotificationSettings = useCallback(async () => {
    if (!apiClient || !state.notificationSettings) return

    setState(prev => ({ ...prev, saving: true }))

    try {
      const body = state.notificationSettings
      let saved: ApiTypes.NotificationSettings | null = null

      // If record has an id, update directly
      if (body.id) {
        saved = await apiClient.updateNotificationSettings(body)
      } else {
        try {
          // Try create first
          saved = await apiClient.createNotificationSettings(body)
        } catch (e: unknown) {
          const err = e as { response?: { status?: number } }
          const status = err?.response?.status
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setState(prev => ({ ...prev, saving: false }))
      toast.error(err.response?.data?.detail || 'Failed to save notification settings')
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setState(prev => ({ ...prev, saving: false }))
      toast.error(err.response?.data?.detail || 'Failed to update profile')
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
      let response: ApiTypes.ServiceTestResult

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
    } catch (error: unknown) {
      console.error(`Error testing ${service}:`, error)
      toast.error(`Failed to test ${service} connection`)
      throw error
    }
  }, [apiClient])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState(prev => ({
      ...prev,
      systemSettings: prev.systemSettings ? {
        ...prev.systemSettings,
        ...DEFAULT_SYSTEM_SETTINGS
      } : null,
      notificationSettings: prev.notificationSettings ? {
        ...prev.notificationSettings,
        ...DEFAULT_NOTIFICATION_SETTINGS
      } : null,
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setState(prev => ({ ...prev, saving: false }))
      toast.error(err.response?.data?.detail || 'Failed to upload avatar')
      throw error
    }
  }, [apiClient])

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setState(prev => ({ ...prev, saving: false }))
      toast.error(err.response?.data?.detail || 'Failed to update avatar')
      throw error
    }
  }, [apiClient])

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
    } catch (error: unknown) {
      console.error('Error exporting settings:', error)
      toast.error('Failed to export settings')
      throw error
    }
  }, [apiClient])

  const toggleNotificationService = useCallback(async (service: 'email' | 'whatsapp' | 'push', enabled: boolean) => {
  if (!apiClient) {
    toast.error('API client not ready')
    return
  }

  setState(prev => ({ ...prev, saving: true }))
  
  try {
    const fieldMap = {
      email: 'email_notifications_enabled',
      whatsapp: 'whatsapp_notifications_enabled', 
      push: 'push_notifications_enabled'
    }
    
    const updateData = {
      [fieldMap[service]]: enabled
    }
    
    await apiClient.updateSystemSettings(updateData)
    
    // Refresh status to get updated info
    const newStatus = await apiClient.getServiceStatus()
    
    setState(prev => ({
      ...prev,
      systemSettings: prev.systemSettings ? {
        ...prev.systemSettings,
        ...updateData
      } : null,
      serviceStatus: newStatus,
      saving: false,
      hasUnsavedChanges: false
    }))
    
    toast.success(`${service.charAt(0).toUpperCase() + service.slice(1)} notifications ${enabled ? 'enabled' : 'disabled'}`)

  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } }; message?: string }
    setState(prev => ({ ...prev, saving: false }))
    toast.error(`Failed to update ${service} notifications: ${err.response?.data?.detail || err.message}`)
    throw error
  }
}, [apiClient])

// Refresh service status (for "Check Again" button)
const refreshServiceStatus = useCallback(async () => {
  if (!apiClient) return
  
  try {
    const status = await apiClient.getServiceStatus()
    setState(prev => ({
      ...prev,
      serviceStatus: status
    }))
    return status
  } catch (error) {
    console.error('Failed to refresh service status:', error)
    throw error
  }
}, [apiClient])

// Simple helper - are all services ready to use?
const isFullyConfigured = useCallback(() => {
  if (!state.serviceStatus) return false
  return state.serviceStatus.smtp.configured && 
         state.serviceStatus.whatsapp.configured && 
         state.serviceStatus.push.configured
}, [state.serviceStatus])

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
    toggleNotificationService,
    refreshServiceStatus,
    
    // Computed values
    isLoaded: !state.loading && (state.systemSettings !== null || state.notificationSettings !== null || state.userProfile !== null),
    canSave: state.hasUnsavedChanges && !state.saving,
    isFullyConfigured: isFullyConfigured(),
    
    // Helper methods
    clearUnsavedChanges: () => setState(prev => ({ ...prev, hasUnsavedChanges: false })),
    clearTestResults: () => setState(prev => ({ ...prev, testResults: {} }))
  }
}