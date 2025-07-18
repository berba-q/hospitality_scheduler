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
import { SwapRequestModal } from '@/components/swap/SwapRequestModal'

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
    acceptanceRate: 85,
    helpfulnessScore: 78,
    currentStreak: 3,
    totalHelped: 8,
    teamRating: 85,
    avgResponseTime: '1.2 hours'
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
  const [facilityShifts, setFacilityShifts] = useState([])
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [selectedAssignmentForSwap, setSelectedAssignmentForSwap] = useState(null)
  const [currentSchedule, setCurrentSchedule] = useState(null)
  const [staff, setStaff] = useState([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Loading dashboard data...')
      console.log('User:', user)
      console.log('ApiClient available:', !!apiClient)
      console.log('getMyDashboardStats available:', !!apiClient?.getMyDashboardStats)
      
      if (!apiClient) {
        throw new Error('API Client is not available')
      }

      if (!apiClient.getMyDashboardStats) {
        throw new Error('getMyDashboardStats method is not available')
      }

      // Try to call the API
      console.log('Calling getMyDashboardStats...')
      const stats = await apiClient.getMyDashboardStats()
      console.log('Raw dashboard stats received:', stats)
      
      if (!stats) {
        console.warn('No stats returned from API')
        setLoading(false)
        return
      }
      
      // Process the stats data safely
      const processedStats = {
        thisWeekHours: stats.current_week?.hours_scheduled || stats.thisWeekHours || 0,
        nextWeekHours: stats.nextWeekHours || 0,
        upcomingShifts: stats.upcoming_shifts || stats.upcomingShifts || [],
        pendingSwaps: stats.swap_requests?.my_pending || stats.pendingSwaps || 0,
        // Keep mock gamification data for now
        acceptanceRate: 85,
        helpfulnessScore: 78,
        currentStreak: 3,
        totalHelped: 8,
        teamRating: 85,
        avgResponseTime: '1.2 hours'
      }

      console.log('Processed stats:', processedStats)

      // Process upcoming shifts if they exist
      if (stats.upcoming_shifts && Array.isArray(stats.upcoming_shifts)) {
        console.log('Processing upcoming shifts:', stats.upcoming_shifts)
        processedStats.upcomingShifts = stats.upcoming_shifts.map((shift: any) => ({
          ...shift,
          shift_name: shift.shift_name || getShiftName(shift.shift),
          day_name: shift.day_name || getDayName(shift.date)
        }))
        
        // Calculate next week hours (8 hours per shift)
        processedStats.nextWeekHours = stats.upcoming_shifts.length * 8
      }

      setDashboardStats(processedStats)
      console.log('Dashboard stats updated successfully')
      
      // Try to load team insights (optional)
      if (user?.facility_id) {
        try {
          console.log('Loading team insights for facility:', user.facility_id)
          const insights = await apiClient.getTeamInsights(user.facility_id)
          if (insights) {
            setTeamInsights(insights)
            console.log('Team insights loaded:', insights)
          }
        } catch (insightsError) {
          console.log('Team insights not available:', insightsError.message)
        }
      }
      
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      setError(`Failed to load dashboard: ${error.message}`)
      
      // Handle specific error types
      if (error.message.includes('403')) {
        setError('Access denied. Please contact your manager.')
      } else if (error.message.includes('404')) {
        setError('Staff profile not found. Please contact your manager to set up your profile.')
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again later.')
      }
      
      // Don't show toast for expected errors
      if (!error.message.includes('404') && !error.message.includes('403')) {
        toast.error('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  // LOAD FACILITY DATA
  useEffect(() => {
    const loadFacilityShifts = async () => {
      try {
        console.log('🚀 Starting facility shifts loading process...')
        console.log('🔍 COMPREHENSIVE USER OBJECT ANALYSIS:')
        console.log('  - user exists:', !!user)
        console.log('  - user type:', typeof user)
        
        if (user) {
          console.log('  - user keys:', Object.keys(user))
          console.log('  - Full user object:', user)
          
          // Check for various possible facility ID fields
          const possibleFacilityFields = [
            'facility_id', 'facilityId', 'facility', 
            'facilityID', 'facility_uuid', 'current_facility_id'
          ]
          
          console.log('  - Checking possible facility ID fields:')
          possibleFacilityFields.forEach(field => {
            console.log(`    ${field}:`, user[field])
          })
        }
        
        // Try multiple ways to get facility ID
        const facilityId = user?.facility_id || 
                          user?.facilityId || 
                          user?.facility || 
                          user?.facilityID || 
                          user?.facility_uuid ||
                          user?.current_facility_id
        
        console.log('🔍 Resolved facility ID:', facilityId)
        
        if (!facilityId) {
          console.warn('❌ No facility ID found in any expected field')
          console.log('🔧 You may need to:')
          console.log('  1. Check how the user object is populated')
          console.log('  2. Ensure staff records have facility_id')
          console.log('  3. Check if facility info comes from a different source')
          
          // Use fallback shifts
          setFacilityShifts(getFallbackShifts())
          return
        }
        
        if (!apiClient) {
          console.warn('❌ No apiClient available')
          setFacilityShifts(getFallbackShifts())
          return
        }
        
        console.log('🔧 Checking apiClient methods:')
        console.log('  - getFacilityShifts exists:', !!apiClient.getFacilityShifts)
        console.log('  - Available apiClient methods:', Object.keys(apiClient).filter(key => typeof apiClient[key] === 'function'))
        
        if (!apiClient.getFacilityShifts) {
          console.error('❌ getFacilityShifts method not found in apiClient')
          console.log('🔧 Available methods that might work:')
          const shiftMethods = Object.keys(apiClient).filter(key => 
            key.toLowerCase().includes('shift') && typeof apiClient[key] === 'function'
          )
          console.log('  - Shift-related methods:', shiftMethods)
          
          setFacilityShifts(getFallbackShifts())
          return
        }
        
        console.log('🔧 Calling apiClient.getFacilityShifts with facility_id:', facilityId)
        
        try {
          const shifts = await apiClient.getFacilityShifts(facilityId)
          
          console.log('======= RAW FACILITY SHIFTS API RESPONSE =======')
          console.log('Type:', typeof shifts)
          console.log('Is Array:', Array.isArray(shifts))
          console.log('Length:', shifts?.length)
          console.log('Full response:', shifts)
          
          if (shifts && Array.isArray(shifts) && shifts.length > 0) {
            console.log('======= FIRST SHIFT DETAILED BREAKDOWN =======')
            const firstShift = shifts[0]
            console.log('First shift:', firstShift)
            console.log('Available properties:')
            Object.keys(firstShift).forEach(key => {
              console.log(`  ${key}:`, firstShift[key], `(${typeof firstShift[key]})`)
            })
            
            setFacilityShifts(shifts)
            console.log('✅ Facility shifts loaded successfully:', shifts.length, 'shifts')
          } else {
            console.warn('⚠️ Invalid shifts response, using fallback')
            setFacilityShifts(getFallbackShifts())
          }
          console.log('===============================================')
          
        } catch (apiError) {
          console.error('❌ API call failed:', apiError)
          console.error('API Error details:', {
            message: apiError.message,
            stack: apiError.stack,
            response: apiError.response?.data,
            status: apiError.response?.status,
            url: apiError.config?.url
          })
          setFacilityShifts(getFallbackShifts())
        }
        
      } catch (error) {
        console.error('❌ Failed to load facility shifts:', error)
        setFacilityShifts(getFallbackShifts())
      }
    }
    
    loadFacilityShifts()
  }, [user, apiClient])

  // Load swaps data
  useEffect(() => {
    const loadSwapModalData = async () => {
      try {
        console.log('🔄 Loading swap modal data...')
        console.log('🔍 Prerequisites for swap modal:')
        console.log('  - user exists:', !!user)
        console.log('  - apiClient exists:', !!apiClient)
        
        // Try multiple ways to get facility ID (same as above)
        const facilityId = user?.facility_id || 
                          user?.facilityId || 
                          user?.facility || 
                          user?.facilityID || 
                          user?.facility_uuid ||
                          user?.current_facility_id
        
        console.log('  - facility ID resolved:', facilityId)
        
        if (facilityId && apiClient) {
          console.log('🔧 Checking available methods for swap modal:')
          console.log('  - getCurrentSchedule:', !!apiClient.getCurrentSchedule)
          console.log('  - getFacilityStaff:', !!apiClient.getFacilityStaff)
          
          // Load current schedule and staff data for the modal
          const promises = []
          
          if (apiClient.getCurrentSchedule) {
            promises.push(
              apiClient.getCurrentSchedule(facilityId).catch((error) => {
                console.log('getCurrentSchedule failed:', error.message)
                return null
              })
            )
          } else {
            promises.push(Promise.resolve(null))
          }
          
          if (apiClient.getFacilityStaff) {
            promises.push(
              apiClient.getFacilityStaff(facilityId).catch((error) => {
                console.log('getFacilityStaff failed:', error.message)
                return []
              })
            )
          } else {
            promises.push(Promise.resolve([]))
          }
          
          const [scheduleData, staffData] = await Promise.all(promises)
          
          console.log('📊 Swap modal data loaded:')
          console.log('  - Schedule data:', scheduleData)
          console.log('  - Staff data length:', staffData?.length)
          console.log('  - Staff data:', staffData)
          
          setCurrentSchedule(scheduleData)
          setStaff(staffData || [])
          
          console.log('✅ Swap modal data loading complete')
        } else {
          console.warn('⚠️ Cannot load swap modal data - missing facility ID or apiClient')
        }
      } catch (error) {
        console.error('Failed to load swap modal data:', error)
      }
    }
    
    loadSwapModalData()
  }, [user, apiClient])



  // Handle quick swap requests
  const handleQuickSwapRequest = (shift: any) => {
  console.log('🔄 Quick swap request for shift:', shift)
  
  // Get shift details from facility configuration
  const shiftDetails = getShiftDetails(shift.shift)
  
  // Create assignment object from shift data - INCLUDING SHIFT ID for auto assignments
  const assignmentDetails = {
    id: shift.id || shift.assignment_id, // 🔥 CRITICAL: Include shift ID for auto assignment
    day: shift.day,
    shift: shift.shift,
    staffId: user?.staff_id || user?.id,
    date: shift.date,
    shiftName: shift.shift_name || shiftDetails.name, // Use actual shift name
    shiftTime: shiftDetails.time, // 🔥 NEW: Use dynamic facility shift times
    scheduleId: shift.schedule_id,
    facilityShiftId: shiftDetails.id // Include facility shift ID
  }
  
  console.log('🎯 Assignment details for swap:', assignmentDetails)
  console.log('🕐 Using facility shift times:', shiftDetails)
  
  // Set the selected assignment for the swap modal
  setSelectedAssignmentForSwap(assignmentDetails)
  
  // Open the swap modal
  setShowSwapModal(true)
}


  // Create the swap request
  const createSwapRequest = async (swapData: any) => {
    try {
      console.log('🚀 Creating swap request:', swapData)
      
      const staffId = user?.staff_id || user?.id
      if (!staffId) {
        throw new Error('Staff ID not found')
      }

      // Call the API to create swap request
      await apiClient.createSwapRequest({
        ...swapData,
        requesting_staff_id: staffId
      })
      
      toast.success('Swap request created successfully!')
      
      // Refresh dashboard data to update pending swaps count
      loadDashboardData()
      
    } catch (error: any) {
      console.error('❌ Failed to create swap request:', error)
      toast.error(error.message || 'Failed to create swap request')
      throw error
    }
  }

  const handleTimeOffRequest = async (requestData: any) => {
    try {
      const staffId = user.staffId || user.staff_id || user.id
      if (!staffId) {
        throw new Error('Staff ID not found in user object')
      }
      
      await apiClient.createTimeOffRequest(staffId, requestData)
      toast.success('Time off request submitted!')
      
      loadDashboardData()
    } catch (error: any) {
      console.error('Failed to submit time off request:', error)
      throw error
    }
  }

  // Helper functions
  const getShiftName = (shiftIndex: number) => {
    const shiftNames = ['Morning', 'Afternoon', 'Evening']
    return shiftNames[shiftIndex] || 'Unknown'
  }

  const getShiftDetails = (shiftIndex: number) => {
    const shift = facilityShifts[shiftIndex]
    if (!shift) {
      // Fallback for missing shift data
      return {
        name: `Shift ${shiftIndex + 1}`,
        time: 'Time TBD',
        id: `fallback-${shiftIndex}`
      }
    }
    
    return {
      name: shift.shift_name,
      time: `${shift.start_time} - ${shift.end_time}`,
      id: shift.id
    }
  }

  const getDayName = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    } catch {
      return 'Unknown'
    }
  }

  const transformShiftsForModal = (facilityShifts: any[]) => {
  return facilityShifts.map((shift, index) => ({
    ...shift,
    // Add the fields the modal expects
    time: `${shift.start_time} - ${shift.end_time}`, // This is what the modal looks for!
    name: shift.shift_name || shift.name,
    shift_index: index,
    color: shift.color || 'bg-gray-100'
  }))
}

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={loadDashboardData} variant="outline">
                Retry
              </Button>
              <Button onClick={() => router.push('/swaps')}>
                View Swaps
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
              <h1 className="text-2xl font-bold">Welcome back, {user?.name || user?.email || 'Staff Member'}!</h1>
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
                        onClick={() => handleQuickSwapRequest(shift)}
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
        userStaffId={user?.staffId || user?.staff_id || user?.id}
      />

      {/* Swap Request Modal */}
      <SwapRequestModal
        open={showSwapModal}
        onClose={() => {
          setShowSwapModal(false)
          setSelectedAssignmentForSwap(null)
        }}
        schedule={currentSchedule}
        currentAssignment={selectedAssignmentForSwap}
        staff={staff}
        shifts={transformShiftsForModal(facilityShifts)} // Use dynamic facility shifts
        days={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
        isManager={false} // Staff dashboard, so not a manager
        onSwapRequest={createSwapRequest}
      />
    </div>
  )
}