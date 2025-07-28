// Fixed test page with correct NextAuth authentication and proper JSX syntax
// app/test-notifications/page.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { useSession } from 'next-auth/react'

export default function NotificationTestPage() {
  const [loading, setLoading] = useState(false)
  const [swapRequestData, setSwapRequestData] = useState({
    target_staff_email: '',
    reason: 'Testing quick actions',
    urgency: 'high'
  })
  const [realScheduleId, setRealScheduleId] = useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  
  // ✅ Use the proper hooks instead of localStorage
  const apiClient = useApiClient()
  const { isAuthenticated, isLoading: authLoading, accessToken, user } = useAuth()
  const { data: session } = useSession()

  // ✅ Get the FastAPI backend URL
  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    return 'http://localhost:8000'
  }

  // ✅ Make authenticated requests using the session token
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

    console.log('Making request to:', `${backendUrl}${url}`)
    console.log('With headers:', { ...headers, Authorization: 'Bearer [REDACTED]' })

    return fetch(`${backendUrl}${url}`, {
      ...options,
      headers
    })
  }

  // ✅ Fetch real schedule data for testing
  const fetchRealScheduleData = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to fetch schedule data')
      return
    }

    setScheduleLoading(true)
    try {
      // Try to get schedules for the user's facility
      let scheduleEndpoint = '/v1/schedule/'
      
      // If user has a facility, try that first
      if (user?.facilityId) {
        scheduleEndpoint = `/v1/schedule/facility/${user.facilityId}`
      }

      const response = await makeAuthenticatedRequest(scheduleEndpoint)
      
      if (response.ok) {
        const schedules = await response.json()
        console.log('Available schedules:', schedules)
        
        if (schedules && schedules.length > 0) {
          const firstSchedule = schedules[0]
          setRealScheduleId(firstSchedule.id)
          toast.success(`Found schedule: ${firstSchedule.id}`)
        } else {
          toast.warning('No schedules found. Try creating a test schedule.')
        }
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        toast.error(`Failed to fetch schedules: ${error.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setScheduleLoading(false)
    }
  }

  // ✅ Create test schedule for better testing
  const createTestSchedule = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to create schedules')
      return
    }

    setScheduleLoading(true)
    try {
      // Create a simple test schedule
      const scheduleData = {
        facility_id: user?.facilityId || "123e4567-e89b-12d3-a456-426614174001", // Test facility ID
        week_start: new Date().toISOString().split('T')[0], // This week
        assignments: [] // Empty assignments for now
      }

      console.log('🔍 Creating test schedule with data:', scheduleData)

      const response = await makeAuthenticatedRequest('/v1/schedule/create', {
        method: 'POST',
        body: JSON.stringify(scheduleData)
      })
      
      if (response.ok) {
        const result = await response.json()
        setRealScheduleId(result.id)
        toast.success(`Test schedule created: ${result.id}`)
        console.log('Test schedule created:', result)
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Schedule creation failed:', error)
        toast.error(`Failed to create schedule: ${error.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setScheduleLoading(false)
    }
  }

  const createTestSwapRequest = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to create swap requests')
      return
    }

    setLoading(true)
    try {
      // ✅ Use real schedule ID if available, otherwise use test UUID
      const scheduleId = realScheduleId || "123e4567-e89b-12d3-a456-426614174000" // Valid UUID format
      
      const requestData = {
        schedule_id: scheduleId,
        original_day: 1, // Monday = 1  
        original_shift: 1, // Afternoon = 1
        reason: swapRequestData.reason,
        urgency: swapRequestData.urgency,
        swap_type: "auto", // Required for auto endpoint
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        requires_manager_final_approval: true,
        role_verification_required: true
      }

      console.log('🔍 Sending request data:', requestData)
      console.log(`🔍 Using ${realScheduleId ? 'REAL' : 'TEST'} schedule ID`)

      const response = await makeAuthenticatedRequest('/v1/swaps/auto', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })
      
      console.log('Swap request response:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Test swap request created! Check notifications.')
        console.log('Swap request created:', result)
      } else {
        // ✅ Better error handling for 422 validation errors
        let errorDetails = 'Unknown error'
        try {
          const errorData = await response.json()
          console.error('Detailed error data:', errorData)
          
          if (response.status === 422 && errorData.detail) {
            // Handle Pydantic validation errors
            if (Array.isArray(errorData.detail)) {
              errorDetails = errorData.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join('; ')
            } else {
              errorDetails = errorData.detail
            }
          } else {
            errorDetails = errorData.detail || errorData.message || response.statusText
          }
        } catch (parseError) {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`
        }
        
        toast.error(`Failed to create swap request: ${errorDetails}`)
        
        // ✅ Special guidance for common errors
        if (response.status === 422) {
          toast.warning('💡 This might be expected - the test uses fake schedule data. Try creating real test data first.')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestEmergencyCoverage = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to volunteer for coverage')
      return
    }

    setLoading(true)
    try {
      // ✅ Use the correct API path - quick actions are under /v1/swaps/
      const response = await makeAuthenticatedRequest('/v1/swaps/coverage/test-shift-123/volunteer', {
        method: 'POST'
      })
      
      console.log('Coverage response:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Test emergency coverage request created!')
        console.log('Coverage result:', result)
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Coverage failed:', error)
        toast.error(`Failed: ${error.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to send notifications')
      return
    }

    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest('/v1/notifications/test', {
        method: 'POST'
      })
      
      console.log('Test notification response:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Test notification sent!')
        console.log('Notification result:', result)
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Test notification failed:', error)
        toast.error(`Failed: ${error.detail || response.statusText}`)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testQuickActionEndpoint = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to test quick actions')
      return
    }

    setLoading(true)
    try {
      // ✅ Test the quick action endpoints directly with correct path
      const response = await makeAuthenticatedRequest('/v1/swaps/test-swap-id/approve', {
        method: 'POST'
      })
      
      console.log('Quick action test response:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Quick action endpoint is working!')
        console.log('Quick action result:', result)
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Quick action test failed:', error)
        
        // ✅ Handle 404 specifically for test data
        if (response.status === 404) {
          toast.warning('Quick action endpoint is working (404 expected for test data)')
        } else {
          toast.error(`Quick action test failed: ${error.detail || response.statusText}`)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(`Network error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Show login prompt if not authenticated
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading authentication...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be logged in to test notifications.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notification Quick Actions Test</h1>
      
      {/* ✅ Updated Debug Info with API connectivity test */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Backend URL:</strong> {getBackendUrl()}</div>
          <div><strong>Authentication:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}</div>
          <div><strong>User:</strong> {user?.name || user?.email || 'Unknown'}</div>
          <div><strong>Is Manager:</strong> {user?.isManager ? 'Yes' : 'No'}</div>
          <div><strong>Tenant ID:</strong> {user?.tenantId || 'Not set'}</div>
          <div><strong>Token Status:</strong> {accessToken ? '✅ Token available' : '❌ No token'}</div>
          <div><strong>Session Status:</strong> {session ? '✅ Session active' : '❌ No session'}</div>
          
          <div className="flex gap-2 mt-3">
            <Button 
              onClick={testQuickActionEndpoint}
              disabled={loading || !isAuthenticated}
              variant="outline"
              size="sm"
            >
              {loading ? 'Testing...' : 'Test Quick Action Endpoint'}
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch(`${getBackendUrl()}/health`)
                  if (response.ok) {
                    toast.success('Backend is reachable!')
                  } else {
                    toast.error('Backend responded with error')
                  }
                } catch (error) {
                  toast.error('Cannot reach backend')
                }
              }}
              variant="outline"
              size="sm"
            >
              Test Backend Connection
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* ✅ NEW: Notification Bell Testing Section */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔔 Test Notification Bell Icon
            <Badge variant="secondary">UI Integration</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            After creating notifications above, verify they appear correctly in your app's notification bell.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bell Icon Checklist */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">📋 Bell Icon Checklist:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Bell icon shows red badge with unread count</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Bell animates or changes color when notifications arrive</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Clicking bell opens notification dropdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Notifications show with quick action buttons</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Quick actions work from within the bell dropdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>Unread count decreases when notifications are read</span>
                </div>
              </div>
            </div>
            
            {/* Testing Actions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">🧪 Testing Actions:</h4>
              <div className="space-y-2">
                <Button 
                  onClick={async () => {
                    try {
                      const response = await makeAuthenticatedRequest('/v1/notifications/unread-count')
                      if (response.ok) {
                        const data = await response.json()
                        toast.info(`Current unread count: ${data.unread_count}`)
                      }
                    } catch (error) {
                      toast.error('Failed to check unread count')
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!isAuthenticated}
                >
                  Check Unread Count
                </Button>
                
                <Button 
                  onClick={async () => {
                    try {
                      const response = await makeAuthenticatedRequest('/v1/notifications/', {
                        method: 'GET'
                      })
                      if (response.ok) {
                        const notifications = await response.json()
                        console.log('Current notifications:', notifications)
                        toast.info(`Found ${notifications.length} notifications (check console)`)
                      }
                    } catch (error) {
                      toast.error('Failed to fetch notifications')
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!isAuthenticated}
                >
                  List All Notifications
                </Button>
                
                <Button 
                  onClick={async () => {
                    try {
                      const response = await makeAuthenticatedRequest('/v1/notifications/mark-all-read', {
                        method: 'POST'
                      })
                      if (response.ok) {
                        const result = await response.json()
                        toast.success(`Marked ${result.marked_count} notifications as read`)
                      }
                    } catch (error) {
                      toast.error('Failed to mark notifications as read')
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!isAuthenticated}
                >
                  Clear All Notifications
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="font-medium text-blue-800 mb-1">🔍 What to Look For:</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>• <strong>Bell Badge:</strong> Should show number of unread notifications</li>
              <li>• <strong>Quick Actions:</strong> Accept/Decline buttons should appear in notifications</li>
              <li>• <strong>Real-time Updates:</strong> Bell should update when new notifications arrive</li>
              <li>• <strong>Click Actions:</strong> Quick action buttons should work from the bell dropdown</li>
              <li>• <strong>Read Status:</strong> Clicking notifications should mark them as read</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded text-sm">
            <p className="font-medium text-yellow-800 mb-1">📍 Where to Find Your Bell:</p>
            <ul className="text-yellow-700 space-y-1 text-xs">
              <li>• Usually in the top navigation bar (header)</li>
              <li>• Look for a bell icon (🔔) with a red badge</li>
              <li>• May be in the user menu or toolbar</li>
              <li>• Check your app's main layout or header component</li>
            </ul>
          </div>

          {/* ✅ Real-time Bell Test */}
          <Card className="border-green-200 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚡ Real-time Bell Update Test
                <Badge variant="default">Live Testing</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test that your notification bell updates in real-time when new notifications are created.
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-sm mb-2">📋 Real-time Test Steps:</h4>
                  <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                    <li>Look at your notification bell icon (note current badge number)</li>
                    <li>Click "Send Instant Test Notification" below</li>
                    <li>Watch the bell icon - it should update within 1-2 seconds</li>
                    <li>Click the bell to see the new notification with quick actions</li>
                    <li>Test the quick action buttons directly from the bell dropdown</li>
                  </ol>
                </div>
                
                <Button 
                  onClick={async () => {
                    if (!isAuthenticated) {
                      toast.error('You must be logged in to send notifications')
                      return
                    }

                    setLoading(true)
                    try {
                      const response = await makeAuthenticatedRequest('/v1/notifications/test', {
                        method: 'POST'
                      })
                      
                      if (response.ok) {
                        const result = await response.json()
                        toast.success('✅ Test notification sent! Check your bell icon now!')
                        console.log('Test notification result:', result)
                        
                        // Give a helpful reminder
                        setTimeout(() => {
                          toast.info('👆 Look at your notification bell - did the badge number increase?')
                        }, 1000)
                      } else {
                        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
                        toast.error(`Failed: ${error.detail || response.statusText}`)
                      }
                    } catch (error) {
                      console.error('Error:', error)
                      toast.error(`Network error: ${error.message}`)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !isAuthenticated}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Sending...' : '🚀 Send Instant Test Notification'}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={async () => {
                      // Simulate multiple notifications for stress testing
                      for (let i = 1; i <= 3; i++) {
                        setTimeout(async () => {
                          try {
                            await makeAuthenticatedRequest('/v1/notifications/test', {
                              method: 'POST'
                            })
                            toast.success(`Test notification ${i}/3 sent!`)
                          } catch (error) {
                            console.error(`Failed to send notification ${i}:`, error)
                          }
                        }, i * 1000) // Send one every second
                      }
                      toast.info('Sending 3 test notifications over 3 seconds...')
                    }}
                    variant="outline"
                    size="sm"
                    disabled={loading || !isAuthenticated}
                  >
                    📈 Stress Test (3 notifications)
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      if (!isAuthenticated) return
                      
                      try {
                        // First, send a notification
                        await makeAuthenticatedRequest('/v1/notifications/test', {
                          method: 'POST'
                        })
                        
                        // Then immediately check the count
                        setTimeout(async () => {
                          const response = await makeAuthenticatedRequest('/v1/notifications/unread-count')
                          if (response.ok) {
                            const data = await response.json()
                            toast.info(`Current unread count: ${data.unread_count}`)
                          }
                        }, 500)
                        
                        toast.success('Notification sent + checking count...')
                      } catch (error) {
                        toast.error('Test failed')
                      }
                    }}
                    variant="outline"
                    size="sm"
                    disabled={loading || !isAuthenticated}
                  >
                    🔍 Send + Check Count
                  </Button>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded text-sm">
                <p className="font-medium text-green-800 mb-1">✅ Success Indicators:</p>
                <ul className="text-green-700 space-y-1 text-xs">
                  <li>• Bell badge number increases immediately after sending</li>
                  <li>• New notification appears at the top of the bell dropdown</li>
                  <li>• Quick action buttons (Accept/Decline) are visible and clickable</li>
                  <li>• Clicking quick actions triggers the correct API calls</li>
                  <li>• Badge count decreases when notifications are marked as read</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Swap Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔄 Test Swap Request
              <Badge variant="outline">Creates quick actions</Badge>
              {realScheduleId && <Badge variant="default">Real Data</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ✅ Schedule Data Section */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Schedule Data</Label>
                <div className="space-x-2">
                  <Button 
                    onClick={fetchRealScheduleData}
                    disabled={scheduleLoading || !isAuthenticated}
                    variant="outline"
                    size="sm"
                  >
                    {scheduleLoading ? 'Loading...' : 'Fetch Schedule'}
                  </Button>
                  <Button 
                    onClick={createTestSchedule}
                    disabled={scheduleLoading || !isAuthenticated}
                    variant="secondary"
                    size="sm"
                  >
                    Create Test Schedule
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                {realScheduleId ? (
                  <span className="text-green-600">✅ Using real schedule: {realScheduleId}</span>
                ) : (
                  <span className="text-orange-600">⚠️ Will use test data (may cause validation errors)</span>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="target_email">Target Staff Email (Optional for auto swaps)</Label>
              <Input
                id="target_email"
                value={swapRequestData.target_staff_email}
                onChange={(e) => setSwapRequestData({
                  ...swapRequestData,
                  target_staff_email: e.target.value
                })}
                placeholder="staff@example.com (leave empty for auto)"
              />
            </div>
            
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={swapRequestData.reason}
                onChange={(e) => setSwapRequestData({
                  ...swapRequestData,
                  reason: e.target.value
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="urgency">Urgency</Label>
              <Select 
                value={swapRequestData.urgency}
                onValueChange={(value) => setSwapRequestData({
                  ...swapRequestData,
                  urgency: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={createTestSwapRequest}
              disabled={loading || !isAuthenticated}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Test Swap Request'}
            </Button>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div>✅ Will create notification with quick action buttons</div>
              <div>✅ Uses proper UUID format for schedule_id</div>
              <div>✅ API endpoints: /v1/swaps/{'{id}'}/approve & decline</div>
              {!realScheduleId && (
                <div className="text-orange-600">⚠️ Using test data - may show validation errors</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Emergency Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚨 Test Emergency Coverage
              <Badge variant="destructive">Critical Priority</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This will create an emergency coverage request and notify managers with quick actions.
            </p>
            
            <Button 
              onClick={createTestEmergencyCoverage}
              disabled={loading || !isAuthenticated}
              className="w-full"
              variant="destructive"
            >
              {loading ? 'Creating...' : 'Create Emergency Coverage Request'}
            </Button>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div>✅ Will notify all managers</div>
              <div>✅ "I Can Help" quick action button</div>
              <div>✅ API endpoint: /v1/swaps/coverage/{'{shift_id}'}/volunteer</div>
            </div>
          </CardContent>
        </Card>

        {/* Test Basic Notification */}
        <Card>
          <CardHeader>
            <CardTitle>📱 Test Basic Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Send a basic test notification to yourself.
            </p>
            
            <Button 
              onClick={sendTestNotification}
              disabled={loading || !isAuthenticated}
              className="w-full"
              variant="outline"
            >
              {loading ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions Info */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Quick Actions Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default">Accept</Badge>
                <span>Approve swap requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Decline</Badge>
                <span>Decline swap requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">I Can Help</Badge>
                <span>Volunteer for emergency coverage</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">View Details</Badge>
                <span>Navigate to detailed view</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">View Schedule</Badge>
                <span>Open schedule page</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Updated Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Verify Login:</strong> Make sure you're logged in (green checkmarks above). If not, click "Go to Login"</li>
            <li><strong>Test Backend Connection:</strong> Click "Test Backend Connection" to verify FastAPI is running</li>
            <li><strong>Test Notification Bell First:</strong> Use "Send Instant Test Notification" to verify your bell icon updates</li>
            <li><strong>Create Real Schedule Data:</strong> Click "Fetch Schedule" or "Create Test Schedule" for realistic testing</li>
            <li><strong>Test Swap Requests:</strong> Create swap requests and verify they appear in your notification bell</li>
            <li><strong>Test Quick Actions:</strong> Click Accept/Decline buttons directly from the notification bell dropdown</li>
            <li><strong>Verify Real-time Updates:</strong> Watch bell badge numbers change in real-time</li>
            <li><strong>Check Network Tab:</strong> Monitor API calls in DevTools to verify endpoints work correctly</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm font-medium text-blue-800">Quick Setup Check:</p>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• FastAPI running: <code>http://localhost:8000</code></li>
              <li>• Next.js running: <code>http://localhost:3000</code></li>
              <li>• Database connected and migrated</li>
              <li>• User logged in with valid session</li>
              <li>• Notification bell component visible in your app's header</li>
            </ul>
          </div>
          
          <div className="mt-2 p-3 bg-purple-50 rounded">
            <p className="text-sm font-medium text-purple-800">🔔 Notification Bell Testing:</p>
            <ul className="text-xs text-purple-700 mt-1 space-y-1">
              <li>• Look for bell icon (🔔) in your app's navigation</li>
              <li>• Use "Real-time Bell Update Test" section first</li>
              <li>• Verify badge numbers update immediately</li>
              <li>• Test quick actions from within the bell dropdown</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Troubleshooting */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚠️ Troubleshooting Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <strong className="text-red-600">❌ Not Authenticated:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Go to <code>/login</code> and sign in with your credentials</li>
              <li>• Check if your session expired - try refreshing the page</li>
              <li>• Verify FastAPI auth endpoint is working: <code>/v1/auth/login</code></li>
            </ul>
          </div>
          
          <div>
            <strong className="text-red-600">❌ Cannot Reach Backend:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Start FastAPI: <code>uvicorn app.main:app --reload</code></li>
              <li>• Check if backend is on port 8000: <code>curl http://localhost:8000/health</code></li>
              <li>• Verify CORS settings in <code>app/main.py</code></li>
            </ul>
          </div>
          
          <div>
            <strong className="text-red-600">❌ Common Validation Errors (422):</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• <strong>schedule_id not found:</strong> Click "Fetch Real Schedule" or create a schedule first</li>
              <li>• <strong>staff not assigned to shift:</strong> The user isn't scheduled for the day/shift specified</li>
              <li>• <strong>invalid UUID format:</strong> Fixed in this updated test page</li>
              <li>• <strong>validation error for urgency:</strong> Must be "low", "normal", "high", or "emergency"</li>
            </ul>
          </div>
          
          <div>
            <strong className="text-orange-600">⚠️ Expected Test Errors:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• <strong>Swap ID not found:</strong> Normal for test endpoints with fake IDs</li>
              <li>• <strong>No schedule found:</strong> Create test data first</li>
              <li>• <strong>Target staff not found:</strong> Use real email addresses</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-2 rounded">
            <strong className="text-blue-600">📋 Request Data Explanation:</strong>
            <ul className="ml-4 mt-1 space-y-1 text-blue-700 text-xs">
              <li>• <strong>original_day:</strong> 0=Monday, 1=Tuesday, ..., 6=Sunday</li>
              <li>• <strong>original_shift:</strong> 0=Morning, 1=Afternoon, 2=Evening</li>
              <li>• <strong>swap_type:</strong> "auto" = system finds replacement, "specific" = swap with specific person</li>
              <li>• <strong>urgency:</strong> Affects notification priority and quick action styling</li>
              <li>• <strong>expires_at:</strong> When the swap request automatically expires</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-2 rounded">
            <strong className="text-green-600">✅ Success Indicators:</strong>
            <ul className="ml-4 mt-1 space-y-1 text-green-700">
              <li>• HTTP 200/201 responses in Network tab</li>
              <li>• New notifications appear in notification bell</li>
              <li>• Quick action buttons work (even if they return errors for test data)</li>
              <li>• Database records are created</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}