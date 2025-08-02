// src/components/debug/QuickTestNotifications.tsx
// Simple component to test notification quick actions
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useApi'
import { Bell, Send, User, Bug } from 'lucide-react'

export function QuickTestNotifications() {
  const [loading, setLoading] = useState(false)
  
  const { isAuthenticated, accessToken, user } = useAuth()

  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    return 'http://localhost:8000'
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const backendUrl = getBackendUrl()
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers
    }

    console.log('📡 API Request:', `${backendUrl}${url}`)

    return fetch(`${backendUrl}${url}`, {
      ...options,
      headers
    })
  }

  const debugNotifications = async () => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest('/v1/debug/notifications/debug/all')
      
      if (response.ok) {
        const result = await response.json()
        console.log('🔍 Debug notifications result:', result)
        toast.success(`✅ Found ${result.total_notifications} notifications (${result.notifications_with_quick_actions} with quick actions)`)
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to debug notifications:', error)
      toast.error(`❌ Debug failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestSwapNotification = async () => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest('/v1/debug/notifications/test/create-swap', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Test swap notification created!')
        console.log('Test notification result:', result)
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to create test notification:', error)
      toast.error(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestEmergencyNotification = async () => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest('/v1/debug/notifications/test/create-emergency', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Test emergency notification created!')
        console.log('Test emergency notification result:', result)
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to create test emergency notification:', error)
      toast.error(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please log in to test notifications</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="w-5 h-5" />
            Debug Notifications
          </CardTitle>
          <p className="text-sm text-gray-600">
            Logged in as: <strong>{user?.email}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Debug Existing Notifications */}
          <div className="space-y-2">
            <Button 
              onClick={debugNotifications} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Bug className="w-4 h-4 mr-2" />
              Debug All Notifications
            </Button>
            <p className="text-xs text-gray-500">
              Check console for detailed notification data analysis
            </p>
          </div>

          {/* Create Test Notifications */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Button 
                onClick={createTestSwapNotification} 
                disabled={loading}
                size="sm"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Create Test Swap
              </Button>
              <Button 
                onClick={createTestEmergencyNotification} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                Create Test Emergency
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Creates notifications directly via enhanced service
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <strong>Backend:</strong> {getBackendUrl()}
          </div>
          <div>
            <strong>Token:</strong> {accessToken ? '✅ Available' : '❌ Missing'}
          </div>
          <div>
            <strong>User ID:</strong> {user?.id || 'N/A'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}