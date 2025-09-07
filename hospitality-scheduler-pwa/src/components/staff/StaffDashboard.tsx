// hospitality-scheduler-pwa/src/components/staff/StaffDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/hooks/useTranslations' // ADD: Translation hook import
import { 
  Calendar, 
  Clock, 
  ArrowLeftRight, 
  AlertTriangle, 
  TrendingUp,
  Users,
  CalendarOff
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
  const { t } = useTranslations() // ADD: Translation hook
  
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
        toast.error(t('dashboard.failedToLoadData')) // TRANSLATE: Error message
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
        
        // Try multiple ways to get facility ID
        const facilityId = user?.facility_id || 
                          user?.facilityId || 
                          user?.facility || 
                          user?.facilityID || 
                          user?.facility_uuid ||
                          user?.current_facility_id
        
        console.log('  - facility ID resolved:', facilityId)
        
        if (facilityId && apiClient) {
          console.log('🔧 Loading real schedule and staff data...')
          
          // Load staff data first
          let staffData = []
          if (apiClient.getFacilityStaff) {
            try {
              staffData = await apiClient.getFacilityStaff(facilityId)
              console.log('✅ Staff data loaded:', staffData?.length, 'staff members')
            } catch (error) {
              console.log('❌ getFacilityStaff failed:', error.message)
              staffData = []
            }
          }
          
          // Load REAL schedule data using the correct method for staff
          let scheduleData = null
          
          try {
            // Method 1: Try getMySchedule for current week (this is what staff use)
            const now = new Date()
            const startDate = new Date(now)
            startDate.setDate(now.getDate() - now.getDay() + 1) // Monday of current week
            const endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + 6) // Sunday of current week
            
            console.log('🔧 Trying getMySchedule for current week:', {
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            })
            
            scheduleData = await apiClient.getMySchedule(
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            )
            
            console.log('✅ getMySchedule worked! Schedule data:', scheduleData)
            
          } catch (error) {
            console.log('❌ getMySchedule failed:', error.message)
            
            // Method 2: Try getFacilitySchedules as fallback
            try {
              console.log('🔧 Trying getFacilitySchedules as fallback...')
              const allSchedules = await apiClient.getFacilitySchedules(facilityId)
              console.log('📊 All facility schedules:', allSchedules?.length, 'schedules')
              
              // Find the most recent schedule or current week schedule
              if (allSchedules && allSchedules.length > 0) {
                const now = new Date().toISOString().split('T')[0]
                
                // Try to find current week schedule
                scheduleData = allSchedules.find(s => s.week_start <= now) || allSchedules[0]
                console.log('✅ Using facility schedule:', scheduleData)
              }
              
            } catch (facilityError) {
              console.log('❌ getFacilitySchedules also failed:', facilityError.message)
            }
          }
          
          // If we still don't have schedule data, check if it's available from the dashboard stats
          if (!scheduleData && dashboardStats?.upcomingShifts?.length > 0) {
            console.log('🔧 Creating schedule from upcoming shifts...')
            const firstShift = dashboardStats.upcomingShifts[0]
            
            scheduleData = {
              id: firstShift.schedule_id || 'from-upcoming-shifts',
              facility_id: facilityId,
              week_start: firstShift.date || new Date().toISOString().split('T')[0],
              assignments: dashboardStats.upcomingShifts.map(shift => ({
                id: shift.id || shift.assignment_id,
                day: shift.day,
                shift: shift.shift,
                staff_id: user?.staff_id || user?.id,
                schedule_id: shift.schedule_id || 'from-upcoming-shifts'
              }))
            }
            
            console.log('✅ Created schedule from upcoming shifts:', scheduleData)
          }
          
          console.log('📊 Final swap modal data:')
          console.log('  - Schedule data:', scheduleData)
          console.log('  - Staff data length:', staffData?.length)
          
          setCurrentSchedule(scheduleData)
          setStaff(staffData || [])
          
          console.log('✅ Swap modal data loading complete with REAL data')
        } else {
          console.warn('⚠️ Cannot load swap modal data - missing facility ID or apiClient')
        }
      } catch (error) {
        console.error('Failed to load swap modal data:', error)
      }
    }
    
    loadSwapModalData()
  }, [user, apiClient, dashboardStats])

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
      console.log('🚀 Creating swap request with real data:', swapData)
      console.log('🔍 Current schedule:', currentSchedule)
      console.log('🔍 Selected assignment:', selectedAssignmentForSwap)
      
      const staffId = user?.staff_id || user?.id
      if (!staffId) {
        throw new Error('Staff ID not found')
      }

      // Use the REAL schedule ID from the loaded schedule
      const scheduleId = currentSchedule?.id || selectedAssignmentForSwap?.scheduleId
      
      if (!scheduleId) {
        throw new Error('No schedule ID available. Please try refreshing the page.')
      }

      // Create the swap request with real data
      const enhancedSwapData = {
        ...swapData,
        requesting_staff_id: staffId,
        schedule_id: scheduleId, // This should now be a real schedule ID
        assignment_id: selectedAssignmentForSwap?.id,
        original_day: selectedAssignmentForSwap?.day,
        original_shift: selectedAssignmentForSwap?.shift,
      }

      console.log('🎯 Enhanced swap data with real schedule:', enhancedSwapData)

      // Call the API to create swap request
      await apiClient.createSwapRequest(enhancedSwapData)
      
      toast.success(t('dashboard.swapRequestCreated')) // TRANSLATE: Success message
      
      // Refresh dashboard data to update pending swaps count
      loadDashboardData()
      
    } catch (error: any) {
      console.error('❌ Failed to create swap request:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      toast.error(error.message || t('dashboard.failedToCreateSwap')) // TRANSLATE: Error message
      throw error
    }
  }

  const handleTimeOffRequest = async (requestData: any) => {
    try {
      // No need to resolve staff ID anymore - the backend handles it
      await apiClient.createUnavailabilityRequest('', requestData) // staffId not needed
      toast.success(t('dashboard.timeOffRequestSubmitted'))
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

  // Add fallback shifts function (needed by the useEffect)
  const getFallbackShifts = () => {
    return [
      { id: 'fallback-0', shift_name: 'Morning', start_time: '08:00', end_time: '16:00' },
      { id: 'fallback-1', shift_name: 'Afternoon', start_time: '12:00', end_time: '20:00' },
      { id: 'fallback-2', shift_name: 'Evening', start_time: '16:00', end_time: '00:00' }
    ]
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('dashboard.dashboardError')}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={loadDashboardData} variant="outline">
                {t('common.retry')} {/* TRANSLATE: Retry button */}
              </Button>
              <Button onClick={() => router.push('/swaps')}>
                {t('dashboard.viewSwaps')} {/* TRANSLATE: View Swaps button */}
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
              <h1 className="text-2xl font-bold">{t('common.welcomeBack')}, {user?.name || user?.email || t('dashboard.staffMember')}!</h1>
              <p className="text-gray-600">{t('dashboard.scheduleAndTeamOverview')}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{t('common.thisWeek')}</p>
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
                <p className="text-sm text-gray-600">{t('common.thisWeek')}</p>
                <p className="font-semibold">{dashboardStats.thisWeekHours} {t('common.hours')}</p>
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
                <p className="text-sm text-gray-600">{t('common.nextWeek')}</p>
                <p className="font-semibold">{dashboardStats.nextWeekHours} {t('common.hours')}</p>
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
                <p className="text-sm text-gray-600">{t('swaps.pendingSwaps')}</p>
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
                <p className="text-sm text-gray-600">{t('dashboard.teamHelped')}</p>
                <p className="font-semibold">{dashboardStats.totalHelped} {t('common.times')}</p>
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
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
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
                    <p className="font-medium">{t('dashboard.viewMySchedule')}</p>
                    <p className="text-xs text-gray-500">{t('schedule.seeAllShifts')}</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto p-4"
                  onClick={() => router.push('/swaps')}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">{t('swaps.swapRequests')}</p>
                    <p className="text-xs text-gray-500">{t('swaps.manageSwaps')}</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto p-4"
                  onClick={() => setShowTimeOffModal(true)}
                >
                  <CalendarOff className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">{t('unavailable.requestTimeOff')}</p>
                    <p className="text-xs text-gray-500">{t('unavailable.setAvailability')}</p>
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
                {t('dashboard.upcomingShifts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardStats.upcomingShifts.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">{t('dashboard.noUpcomingShifts')}</p>
                  <p className="text-sm text-gray-500">{t('dashboard.checkBackSoon')}</p>
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
                          <Badge className="mt-1 bg-blue-100 text-blue-800">{t('common.today')}</Badge>
                        )}
                        {shift.is_tomorrow && (
                          <Badge className="mt-1 bg-green-100 text-green-800">{t('common.tomorrow')}</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSwapRequest(shift)}
                      >
                        {t('swaps.requestSwap')}
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