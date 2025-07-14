// src/components/staff/StaffDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  CheckCircle,
  Hourglass
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface StaffDashboardStats {
  staff_profile: {
    id: string
    name: string
    role: string
    facility_id: string
  }
  current_week: {
    hours_scheduled: number
    max_hours: number
    utilization_percentage: number
  }
  upcoming_shifts: Array<{
    date: string
    day_name: string
    shift: number
    is_today: boolean
    is_tomorrow: boolean
  }>
  swap_requests: {
    my_pending: number
    awaiting_my_response: number
  }
  facility: {
    id: string
    name: string
  }
}

const SHIFT_NAMES = ['Morning', 'Afternoon', 'Evening']
const SHIFT_TIMES = ['6:00 AM - 2:00 PM', '2:00 PM - 10:00 PM', '10:00 PM - 6:00 AM']

export function StaffDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  
  const [stats, setStats] = useState<StaffDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDashboardData()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading staff dashboard stats...')
      
      // Use the API client method
      const data = await apiClient.getMyDashboardStats()
      setStats(data)
      console.log('Staff dashboard loaded:', data)
    } catch (error: any) {
      console.error('Failed to load staff dashboard:', error)
      
      // Better error handling
      if (error.message.includes('404')) {
        setError('Staff profile not found. Please contact your manager to set up your profile.')
      } else if (error.message.includes('403')) {
        setError('Access denied. This feature is for staff members only.')
      } else if (error.message.includes('401')) {
        setError('Authentication required. Please log in again.')
      } else {
        setError(error.message || 'Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getShiftTime = (shiftIndex: number) => {
    return SHIFT_TIMES[shiftIndex] || 'Unknown'
  }

  const getShiftName = (shiftIndex: number) => {
    return SHIFT_NAMES[shiftIndex] || 'Unknown'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={loadDashboardData} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={() => router.push('/schedule')} className="flex-1">
                View Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    )
  }

  const todayShift = stats.upcoming_shifts.find(shift => shift.is_today)
  const tomorrowShift = stats.upcoming_shifts.find(shift => shift.is_tomorrow)
  const nextShifts = stats.upcoming_shifts.filter(shift => !shift.is_today && !shift.is_tomorrow).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {stats.staff_profile.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.staff_profile.role} • {stats.facility.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-lg font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Shift Alert */}
      {todayShift && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-900">Today's Shift</p>
                <p className="text-green-700">
                  {getShiftName(todayShift.shift)} ({getShiftTime(todayShift.shift)})
                </p>
              </div>
              <Badge variant="outline" className="border-green-300 text-green-700">
                Today
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Week Hours */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.current_week.hours_scheduled}/{stats.current_week.max_hours}
                </p>
                <p className="text-sm text-gray-600">Hours This Week</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(stats.current_week.utilization_percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <Card 
          className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => router.push('/schedule')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming_shifts.length}</p>
                <p className="text-sm text-gray-600">Upcoming Shifts</p>
                <p className="text-xs text-gray-500">Next 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Swap Requests */}
        <Card 
          className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => router.push('/swaps')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.swap_requests.my_pending + stats.swap_requests.awaiting_my_response}
                </p>
                <p className="text-sm text-gray-600">Swap Requests</p>
                {stats.swap_requests.awaiting_my_response > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    {stats.swap_requests.awaiting_my_response} need response
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Profile */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.staff_profile.role}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {stats.facility.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            My Upcoming Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.upcoming_shifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming shifts scheduled</p>
              <p className="text-sm text-gray-500">Check back later or contact your manager</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tomorrowShift && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Tomorrow</p>
                      <p className="text-sm text-blue-700">
                        {getShiftName(tomorrowShift.shift)} • {getShiftTime(tomorrowShift.shift)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    Tomorrow
                  </Badge>
                </div>
              )}
              
              {nextShifts.map((shift, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(shift.date)}</p>
                      <p className="text-sm text-gray-600">
                        {getShiftName(shift.shift)} • {getShiftTime(shift.shift)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/schedule')}>
                    View
                  </Button>
                </div>
              ))}
              
              {stats.upcoming_shifts.length > 4 && (
                <div className="text-center pt-3 border-t">
                  <Button variant="outline" onClick={() => router.push('/schedule')}>
                    View All Shifts ({stats.upcoming_shifts.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => router.push('/schedule')}
            >
              <Calendar className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">View Schedule</p>
                <p className="text-xs text-gray-500">See all your shifts</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => router.push('/swaps')}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Request Swap</p>
                <p className="text-xs text-gray-500">Trade shifts with colleagues</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => toast.info('Time-off requests coming soon!')}
            >
              <Hourglass className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Request Time Off</p>
                <p className="text-xs text-gray-500">Schedule vacation days</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}