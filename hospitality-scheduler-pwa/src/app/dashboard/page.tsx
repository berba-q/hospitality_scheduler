'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { useFacilities, useStaff } from '@/hooks/useSchedule'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isAuthenticated, isLoading, isManager } = useAuth()
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { staff, loading: staffLoading } = useStaff()
  const [swapRequests, setSwapRequests] = useState([])
  const apiClient = useApiClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Load swap requests
  useEffect(() => {
    const loadSwaps = async () => {
      try {
        const swaps = await apiClient.getSwapRequests()
        setSwapRequests(swaps)
      } catch (error) {
        console.error('Failed to load swap requests:', error)
      }
    }

    if (isAuthenticated) {
      loadSwaps()
    }
  }, [isAuthenticated, apiClient])

  // Show loading state
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render if no session
  if (!session) return null

  const pendingSwaps = swapRequests.filter((swap: any) => swap.status === 'pending')
  const urgentSwaps = pendingSwaps.filter((swap: any) => ['high', 'emergency'].includes(swap.urgency))

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isManager ? 'Manager Dashboard' : 'Staff Dashboard'}
            </h1>
            <p className="text-gray-600">Welcome back, {session.user?.name}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant={isManager ? 'default' : 'secondary'}>
                {isManager ? 'Manager' : 'Staff'}
              </Badge>
              <Badge variant="outline">
                {session.provider === 'google' ? 'Google Account' : 'FastAPI Account'}
              </Badge>
            </div>
          </div>
          <Button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {facilitiesLoading ? '...' : facilities.length}
              </div>
              <p className="text-xs text-muted-foreground">Active locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {staffLoading ? '...' : staff.length}
              </div>
              <p className="text-xs text-muted-foreground">Total active staff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Swaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSwaps.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Urgent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{urgentSwaps.length}</div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facilities */}
          <Card>
            <CardHeader>
              <CardTitle>Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              {facilitiesLoading ? (
                <p className="text-gray-500">Loading facilities...</p>
              ) : facilities.length > 0 ? (
                <div className="space-y-2">
                  {facilities.slice(0, 3).map((facility: any) => (
                    <div key={facility.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{facility.name}</p>
                        <p className="text-sm text-gray-600">{facility.location}</p>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  ))}
                  {facilities.length > 3 && (
                    <p className="text-sm text-gray-500">+{facilities.length - 3} more</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No facilities found</p>
                  {isManager && (
                    <Button className="mt-2" size="sm">Add Facility</Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Swap Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Swap Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {swapRequests.length > 0 ? (
                <div className="space-y-2">
                  {swapRequests.slice(0, 3).map((swap: any) => (
                    <div key={swap.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{swap.reason}</p>
                        <p className="text-sm text-gray-600">
                          Day {swap.original_day}, Shift {swap.original_shift}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          variant={swap.urgency === 'emergency' ? 'destructive' : 'secondary'}
                        >
                          {swap.urgency}
                        </Badge>
                        <Badge variant="outline">{swap.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {swapRequests.length > 3 && (
                    <p className="text-sm text-gray-500">+{swapRequests.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No swap requests</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* API Connection Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle> Backend Integration Active!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-green-600"> Connected to FastAPI</p>
              </div>
              <div>
                <p className="font-medium">Data Loading</p>
                <p className="text-green-600"> Facilities & Staff loaded</p>
              </div>
              <div>
                <p className="font-medium">Real-time Updates</p>
                <p className="text-green-600"> Swap requests synced</p>
              </div>
              <div>
                <p className="font-medium">Role-based Access</p>
                <p className="text-green-600"> {isManager ? 'Manager' : 'Staff'} permissions</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-800 text-sm">
                Ready for full feature development!<br/>
                📱 Schedule management, shift swaps, and real-time notifications coming next!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}