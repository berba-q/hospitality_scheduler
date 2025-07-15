// hospitality-scheduler-pwa/src/components/staff/StaffDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Star,
  CalendarOff,
  Hourglass
} from 'lucide-react'
import { toast } from 'sonner'

// Import new components
import { TimeOffRequestModal } from '@/components/availability/TimeOffRequestModal'
import { TeamReliabilityBadges } from '@/components/gamification/TeamReliabilityBadges'
import { ReliabilityProgressCard } from '@/components/gamification/ReliabilityProgressCard'
import { TeamSupportInsights } from '@/components/gamification/TeamSupportInsights'

interface StaffDashboardProps {
  user: any
  apiClient: any
}

export function StaffDashboard({ user, apiClient }: StaffDashboardProps) {
  const router = useRouter()
  
  // State for dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    thisWeekHours: 0,
    nextWeekHours: 0,
    upcomingShifts: [],
    pendingSwaps: 0,
    acceptanceRate: 0,
    helpfulnessScore: 0,
    currentStreak: 0,
    totalHelped: 0,
    teamRating: 85,
    avgResponseTime: 'N/A'
  })
  
  const [teamInsights, setTeamInsights] = useState({
    busyDays: ['Friday', 'Saturday', 'Sunday'],
    needyShifts: ['Evening', 'Weekend Morning'],
    teamCoverage: 78,
    yourContribution: 12,
    recentTrends: 'Team coverage has improved 15% this month'
  })

  const [loading, setLoading] = useState(true)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load staff dashboard stats
      const stats = await apiClient.getStaffDashboardStats()
      setDashboardStats(prev => ({
        ...prev,
        ...stats,
        // Mock some gamification data for demo
        acceptanceRate: 85,
        helpfulnessScore: 78,
        currentStreak: 3,
        totalHelped: 8,
        teamRating: 85,
        avgResponseTime: '1.2 hours'
      }))
      
      // Load team insights (would come from analytics endpoint)
      // const insights = await apiClient.getTeamInsights()
      // setTeamInsights(insights)
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeOffRequest = async (requestData: any) => {
    try {
      await apiClient.createTimeOffRequest(user.staffId, requestData)
      toast.success('Time off request submitted!')
      // Refresh any relevant data
      loadDashboardData()
    } catch (error) {
      console.error('Failed to submit time off request:', error)
      throw error // Re-throw to let modal handle it
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user.name || 'Staff Member'}!</h1>
              <p className="text-gray-600">Here&apos;s your schedule and team activity overview</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold">{dashboardStats.thisWeekHours}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="font-semibold">{dashboardStats.thisWeekHours} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Week</p>
                <p className="font-semibold">{dashboardStats.nextWeekHours} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Swaps</p>
                <p className="font-semibold">{dashboardStats.pendingSwaps}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Team Helped</p>
                <p className="font-semibold">{dashboardStats.totalHelped} times</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Upcoming */}
        <div className="lg:col-span-2 space-y-6">
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
                    <p className="font-medium">Swap Requests</p>
                    <p className="text-xs text-gray-500">Manage shift trades</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto p-4"
                  onClick={() => setShowTimeOffModal(true)}
                >
                  <CalendarOff className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Request Time Off</p>
                    <p className="text-xs text-gray-500">Set unavailability</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Shifts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardStats.upcomingShifts.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No upcoming shifts scheduled</p>
                  <p className="text-sm text-gray-500">Check back soon for new assignments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardStats.upcomingShifts.slice(0, 5).map((shift: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{shift.day_name}</p>
                        <p className="text-sm text-gray-600">
                          {shift.shift_name} • {shift.date}
                        </p>
                        {shift.is_today && (
                          <Badge className="mt-1 bg-blue-100 text-blue-800">Today</Badge>
                        )}
                        {shift.is_tomorrow && (
                          <Badge className="mt-1 bg-green-100 text-green-800">Tomorrow</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/swaps')}
                      >
                        Request Swap
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Gamification & Insights */}
        <div className="space-y-6">
          {/* Team Reliability Progress */}
          <ReliabilityProgressCard stats={dashboardStats} />

          {/* Team Reliability Badges */}
          <TeamReliabilityBadges stats={dashboardStats} />

          {/* Team Support Insights */}
          <TeamSupportInsights insights={teamInsights} />
        </div>
      </div>

      {/* Time Off Request Modal */}
      <TimeOffRequestModal
        isOpen={showTimeOffModal}
        onClose={() => setShowTimeOffModal(false)}
        onSubmit={handleTimeOffRequest}
        userStaffId={user.staffId}
      />
    </div>
  )
}