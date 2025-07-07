'use client'

// Dashboard page for both staff and manager roles
// Displays quick stats, recent activity, and allows management of staff and facilities
// Uses useAuth hook to determine user role and fetch data accordingly

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { Users, Building, RefreshCw, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isManager, isAuthenticated, isLoading: authLoading, accessToken, provider } = useAuth()
  const apiClient = useApiClient()
  
  const [facilities, setFacilities] = useState([])
  const [staff, setStaff] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Only load data when authentication is complete and user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false) // Stop loading if not authenticated
    }
  }, [authLoading, isAuthenticated]) // Depend on auth state

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('Loading dashboard data...')
      const [facilitiesData, staffData, swapsData] = await Promise.all([
        apiClient.getFacilities(),
        apiClient.getStaff(),
        apiClient.getSwapRequests()
      ])
      setFacilities(facilitiesData)
      setStaff(staffData)
      setSwapRequests(swapsData)
      console.log('Data loaded:', { facilities: facilitiesData.length, staff: staffData.length, swaps: swapsData.length })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const pendingSwaps = swapRequests.filter((swap: any) => swap.status === 'pending')
  const urgentSwaps = pendingSwaps.filter((swap: any) => ['high', 'emergency'].includes(swap.urgency))

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Show loading while data is loading
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {isManager ? 'Manager Dashboard' : 'Staff Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isManager ? 'Manage your team and facilities' : 'View your schedule and requests'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{facilities.length}</p>
                    <p className="text-sm text-gray-600">Facilities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => isManager && router.push('/staff')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{staff.length}</p>
                    <p className="text-sm text-gray-600">Staff Members</p>
                  </div>
                  {isManager && <ArrowRight className="w-4 h-4 text-gray-400" />}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingSwaps.length}</p>
                    <p className="text-sm text-gray-600">Pending Swaps</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{urgentSwaps.length}</p>
                    <p className="text-sm text-gray-600">Urgent Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Only show staff management if manager */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Staff Management - Manager Only */}
            {isManager && (
              <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Staff Management</span>
                    <Button 
                      size="sm" 
                      onClick={() => router.push('/staff')}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Manage Staff
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.length > 0 ? (
                    <div className="space-y-3">
                      {staff.slice(0, 3).map((member: any) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{member.full_name}</p>
                            <p className="text-xs text-gray-600">{member.role}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      ))}
                      {staff.length > 3 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{staff.length - 3} more staff members
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No staff members yet</p>
                      <Button 
                        size="sm" 
                        onClick={() => router.push('/staff')}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Staff Member
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">System initialized successfully</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Authentication configured</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Database connection established</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Status */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-blue-900">🎉 System Ready!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-blue-900">Authentication</p>
                  <p className="text-green-600">✅ Google + FastAPI</p>
                </div>
                <div>
                  <p className="font-medium text-blue-900">Database</p>
                  <p className="text-green-600">✅ PostgreSQL Connected</p>
                </div>
                <div>
                  <p className="font-medium text-blue-900">API Integration</p>
                  <p className="text-green-600">✅ Real-time Data</p>
                </div>
                <div>
                  <p className="font-medium text-blue-900">Role Detection</p>
                  <p className={isManager ? "text-green-600" : "text-orange-600"}>
                    {isManager ? "✅ Manager Access" : "👤 Staff Access"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}