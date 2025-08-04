'use client'

// Dashboard page for both staff and manager roles
// Displays role-specific dashboards with appropriate data and functionality

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations' // Add translation hook
import { Users, Building, RefreshCw, AlertTriangle, Plus, ArrowRight, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StaffDashboard } from '@/components/staff/StaffDashboard'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isManager, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  const { t } = useTranslations() // Add translation hook
  
  // Manager-specific state
  const [facilities, setFacilities] = useState([])
  const [staff, setStaff] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Only load manager data when authentication is complete and user is a manager
  useEffect(() => {
    if (!authLoading && isAuthenticated && isManager) {
      loadManagerData()
    } else if (!authLoading && isAuthenticated) {
      // For staff, we don't need to load manager data
      setLoading(false)
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated, isManager])

  const loadManagerData = async () => {
    try {
      setLoading(true)
      console.log('Loading manager dashboard data...')
      const [facilitiesData, staffData, swapsData] = await Promise.all([
        apiClient.getFacilities(),
        apiClient.getStaff(),
        apiClient.getSwapRequests()
      ])
      setFacilities(facilitiesData)
      setStaff(staffData)
      setSwapRequests(swapsData)
      console.log('Manager data loaded:', { facilities: facilitiesData.length, staff: staffData.length, swaps: swapsData.length })
    } catch (error) {
      console.error('Failed to load manager dashboard data:', error)
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
            <p className="text-gray-600">{t('auth.checkingAuthentication')}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Staff Dashboard - Completely different interface
  if (!isManager) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <StaffDashboard 
              user={user} 
              apiClient={apiClient} 
            />
          </div>
        </div>
      </AppLayout>
    )
  }

  // Manager Dashboard - Original functionality
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('dashboard.loadingData')}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Manager Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {t('dashboard.managerDashboard')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('dashboard.manageTeamAndFacilities')}
            </p>
          </div>

          {/* Manager Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Facilities Card */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{facilities.length}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.facilities')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Staff Card */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.staffMembers')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Swaps Card */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{pendingSwaps.length}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.pendingSwaps')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Urgent Requests Card */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{urgentSwaps.length}</p>
                    <p className="text-sm text-gray-600">{t('dashboard.urgentRequests')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Manage Schedules */}
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => router.push('/schedule')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('dashboard.manageSchedules')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('dashboard.createAndEditSchedules')}
                    </p>
                    <Button variant="outline" size="sm">
                      {t('common.viewMore')} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Manage Staff */}
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => router.push('/staff')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('dashboard.manageStaff')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('dashboard.addEditOrganizeTeam')}
                    </p>
                    <Button variant="outline" size="sm">
                      {t('common.viewMore')} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Review Swaps */}
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => router.push('/swaps')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('dashboard.reviewSwaps')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('dashboard.approveAndManageChanges')}
                    </p>
                    <Button variant="outline" size="sm">
                      {t('common.viewMore')} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <RefreshCw className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8">
          {/* Recent Activity - Manager View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('dashboard.recentActivity')}
                <Button variant="outline" size="sm" onClick={loadManagerData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.refresh')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {swapRequests.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">{t('dashboard.noRecentSwapRequests')}</p>
                  <p className="text-sm text-gray-500">{t('dashboard.newRequestsWillAppear')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swapRequests.slice(0, 5).map((swap: any) => (
                    <div key={swap.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          swap.status === 'pending' ? 'bg-orange-100' : 
                          swap.status === 'approved' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <RefreshCw className={`w-4 h-4 ${
                            swap.status === 'pending' ? 'text-orange-600' : 
                            swap.status === 'approved' ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {swap.requesting_staff?.full_name || t('dashboard.staffMember')} {t('dashboard.requestsSwap')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {swap.reason || t('dashboard.noReasonProvided')} • {new Date(swap.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          swap.status === 'pending' ? 'destructive' : 
                          swap.status === 'approved' ? 'default' : 'secondary'
                        }>
                          {t(`dashboard.status.${swap.status}`)}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/swaps')}>
                          {t('dashboard.review')}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {swapRequests.length > 5 && (
                    <div className="text-center pt-3 border-t">
                      <Button variant="outline" onClick={() => router.push('/swaps')}>
                        {t('dashboard.viewAllRequests')} ({swapRequests.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}