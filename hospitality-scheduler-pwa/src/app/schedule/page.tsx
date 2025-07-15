// schedule/page.tsx - role based scheduling page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Plus, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Save, 
  Zap, 
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Building,
  MapPin,
  Layers,
  List,
  RefreshCw,
  User,
  ArrowLeftRight,
  Bell,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { DailyCalendar } from '@/components/schedule/DailyCalendar'
import { WeeklyCalendar } from '@/components/schedule/WeeklyCalendar'
import { MonthlyCalendar } from '@/components/schedule/MonthlyCalendar'
import { SmartGenerateModal } from '@/components/schedule/SmartGenerateModal'
import { ScheduleConfigModal } from '@/components/schedule/ScheduleConfigModal'
import { ScheduleListModal } from '@/components/schedule/ScheduleListModal'
import { StaffAssignmentPanel } from '@/components/schedule/StaffAssignmentPanel'
import { FacilityZoneSelector } from '@/components/schedule/FacilityZoneSelector'
import { toast } from 'sonner'
import { SwapRequestModal } from '@/components/swap/SwapRequestModal'
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { SwapStatusIndicator } from '@/components/swap/SwapStatusIndicator'
import { FacilitySwapModal } from '@/components/swap/FacilitySwapModal'
import SwapDetailModal  from '@/components/swap/SwapDetailModal'
import { Select } from '@/components/ui/select'
import { useSwapRequests } from '@/hooks/useSwapRequests'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ViewPeriod = 'daily' | 'weekly' | 'monthly'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = [
  { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800 border-purple-200' }
]

// Facility zones/departments mapping
const FACILITY_ZONES = {
  'hotel': [
    { id: 'front-desk', name: 'Front Desk', roles: ['Front Desk Agent', 'Concierge', 'Manager'] },
    { id: 'housekeeping', name: 'Housekeeping', roles: ['Housekeeping', 'Maintenance'] },
    { id: 'restaurant', name: 'Restaurant', roles: ['Chef', 'Sous Chef', 'Waiter', 'Waitress'] },
    { id: 'bar', name: 'Bar & Lounge', roles: ['Bartender', 'Host/Hostess'] },
    { id: 'security', name: 'Security', roles: ['Security'] }
  ],
  'restaurant': [
    { id: 'kitchen', name: 'Kitchen', roles: ['Chef', 'Sous Chef', 'Line Cook'] },
    { id: 'dining', name: 'Dining Room', roles: ['Waiter', 'Waitress', 'Host/Hostess'] },
    { id: 'bar', name: 'Bar', roles: ['Bartender'] },
    { id: 'management', name: 'Management', roles: ['Manager', 'Assistant Manager'] }
  ],
  'default': [
    { id: 'all', name: 'All Areas', roles: [] }
  ]
}

// ============================================================================
// STAFF VIEW COMPONENT
// ============================================================================
function StaffScheduleView({ 
  currentDate, 
  viewPeriod, 
  setCurrentDate, 
  setViewPeriod, 
  navigatePeriod, 
  formatPeriodDisplay,
  schedules,
  staff,
  currentSchedule,
  swapRequests,
  onSwapRequest,
  user 
}) {
  const [myScheduleData, setMyScheduleData] = useState(null)
  const [mySwapRequests, setMySwapRequests] = useState([])
  const [selectedSwapForDetail, setSelectedSwapForDetail] = useState(null)
  const [showSwapDetailModal, setShowSwapDetailModal] = useState(false)
  const [showMySwapsModal, setShowMySwapsModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const apiClient = useApiClient()

  useEffect(() => {
    loadMyData()
  }, [currentDate, viewPeriod])

  // FIXED: This should be loadMyData, not loadData
  const loadMyData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on view period
      const startDate = getPeriodStart(currentDate, viewPeriod)
      let endDate = new Date(startDate)
      
      switch (viewPeriod) {
        case 'daily':
          endDate = new Date(startDate)
          break
        case 'weekly':
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          break
        case 'monthly':
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
          break
      }
      
      // FIXED: Use existing getMySchedule method
      try {
        const scheduleData = await apiClient.getMySchedule(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
        
        console.log('📊 Raw schedule data received:', scheduleData)
        
        // ✅ Handle the correct response structure from backend
        if (scheduleData && scheduleData.assignments) {
          setMyScheduleData(scheduleData)
          console.log(`✅ Schedule loaded: ${scheduleData.assignments.length} assignments found`)
        } else {
          console.log('⚠️ No schedule data or assignments found')
          setMyScheduleData({ assignments: [] })
        }
      } catch (error) {
        console.warn('getMySchedule failed:', error)
        setMyScheduleData({ assignments: [] })
      }

      // get swaap requests for staff
      try {
        const swaps = await apiClient.getMySwapRequests(undefined, 50)
        setMySwapRequests(swaps)
      } catch (error) {
        console.warn('Failed to load my swap requests:', error)
        setMySwapRequests([])
      }
      
    } catch (error) {
      console.error('Failed to load my data:', error)
      setMyScheduleData([])
      setMySwapRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Helper function for period start calculation
  const getPeriodStart = (date: Date, period: ViewPeriod) => {
    const result = new Date(date)
    
    switch (period) {
      case 'daily':
        return result
      case 'weekly':
        const dayOfWeek = result.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        result.setDate(result.getDate() - daysToMonday)
        return result
      case 'monthly':
        result.setDate(1)
        return result
    }
  }

  // Get my assignments from current schedule
  const getAssignmentCount = () => {
    if (!myScheduleData || !myScheduleData.assignments) {
      return 0
    }
    return myScheduleData.assignments.length
  }

  // get assignments for display
  const getAssignmentsForDisplay = () => {
    if (!myScheduleData || !myScheduleData.assignments) {
      return []
    }
    return myScheduleData.assignments
  }

  // get shift names
  const getShiftName = (shiftIndex) => {
    const shiftNames = ['Morning', 'Afternoon', 'Evening']
    return shiftNames[shiftIndex] || 'Unknown'
  }
  
  // Calculate today's assignments
 const getTodayAssignments = () => {
    // Use the new data structure
    const assignments = getAssignmentsForDisplay()
    if (!assignments.length) return []
    
    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0] // Format: "2025-07-16"
    
    // ilter by actual date instead of day index
    return assignments.filter(assignment => 
      assignment.date === todayDateString
    )
  }

  const todayAssignments = getTodayAssignments()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Staff Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="gap-2 hover:bg-gray-100"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                My Schedule
              </h1>
              <p className="text-gray-600 mt-1">View your work schedule and request shift swaps</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Today's shifts indicator */}
            {todayAssignments.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {todayAssignments.length} shift{todayAssignments.length > 1 ? 's' : ''} today
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Swap requests badge */}
            {swapRequests?.length > 0 && (
              <Button
                variant="outline"
                className="relative"
                onClick={() => setShowMySwapsModal(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                My Swaps
                {mySwapRequests.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5">
                    {mySwapRequests.length}
                  </Badge>
                )}
            </Button>
            )}
          </div>
        </div>

        {/* Staff Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Period Selection */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                View Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewPeriod} onValueChange={(value) => setViewPeriod(value as ViewPeriod)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod(-1)}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="text-xs"
                  >
                    Today
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod(1)}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm font-medium text-center mt-2">
                {formatPeriodDisplay(currentDate, viewPeriod)}
              </p>
            </CardContent>
          </Card>

          {/* My Schedule Summary */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                My Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Period</span>
                  <Badge variant="outline">
                    {getAssignmentCount()} shift{getAssignmentCount() !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {getAssignmentsForDisplay().filter(assignment => {
                  const today = new Date().toISOString().split('T')[0]
                  return assignment.date === today
                }).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-800 mb-1">Today's Shifts</p>
                    {getAssignmentsForDisplay().filter(assignment => {
                      const today = new Date().toISOString().split('T')[0]
                      return assignment.date === today
                    }).map(assignment => {
                      const shift = SHIFTS.find(s => s.id === assignment.shift)
                      return (
                        <div key={assignment.assignment_id} className="text-xs text-green-700">
                          {shift?.name} ({shift?.time})
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onSwapRequest && onSwapRequest(0, 0, user.id)}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Request Swap
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowMySwapsModal(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                View All My Swaps
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/dashboard'}
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => toast.info('Feature coming soon!')}
              >
                <Bell className="w-4 h-4 mr-2" />
                Schedule Notifications
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Staff Calendar Views */}
        <div className="space-y-6">
          {viewPeriod === 'daily' && (
            <DailyCalendar
              key={`staff-daily-${currentDate.getTime()}`}
              currentDate={currentDate}
              schedule={currentSchedule}
              staff={staff}
              shifts={SHIFTS}
              isManager={false}
              draggedStaff={null}
              swapRequests={swapRequests}
              onSwapRequest={onSwapRequest}
              onAssignmentChange={() => {}} // Staff can't modify assignments
              onRemoveAssignment={() => {}} // Staff can't remove assignments
            />
          )}
          
          {viewPeriod === 'weekly' && (
            <WeeklyCalendar
              key={`staff-weekly-${currentDate.getTime()}`}
              currentWeek={getPeriodStart(currentDate, 'weekly')}
              schedule={currentSchedule}
              staff={staff}
              shifts={SHIFTS}
              days={DAYS}
              isManager={false}
              draggedStaff={null}
              swapRequests={swapRequests}
              onSwapRequest={onSwapRequest}
              onAssignmentChange={() => {}} // Staff can't modify assignments
              onRemoveAssignment={() => {}} // Staff can't remove assignments
            />
          )}
          
          {viewPeriod === 'monthly' && (
            <MonthlyCalendar
              key={`staff-monthly-${getPeriodStart(currentDate, 'monthly').getTime()}`}
              currentMonth={getPeriodStart(currentDate, 'monthly')}
              schedules={schedules}
              staff={staff}
              isManager={false}
              swapRequests={swapRequests}
              onDayClick={(date) => {
                setCurrentDate(date)
                setViewPeriod('daily')
              }}
            />
          )}
        </div>

        {/* No schedule message for staff */}
        {!currentSchedule && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Schedule Available</h3>
            <p className="text-gray-600">
              Your manager hasn&apos;t created a schedule for this period yet.
            </p>
          </div>
        )}
      </div>
       {/* swap detail modal */}
         {/* My Swaps List Modal */}
      <Dialog open={showMySwapsModal} onOpenChange={setShowMySwapsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              My Swap Requests ({mySwapRequests.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(80vh-120px)] space-y-4">
            {mySwapRequests.length === 0 ? (
              <div className="text-center py-12">
                <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Swap Requests</h3>
                <p className="text-gray-600 mb-4">You haven't submitted any swap requests yet.</p>
                <Button 
                  onClick={() => {
                    setShowMySwapsModal(false)
                    onSwapRequest && onSwapRequest(0, 0, user?.staff_id || user?.id)
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Swap Request
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {mySwapRequests.map((swap, index) => (
                  <Card key={swap.id || index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={
                              swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              swap.status === 'approved' || swap.status === 'executed' ? 'bg-green-100 text-green-800' :
                              swap.status === 'declined' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {swap.status}
                            </Badge>
                            {swap.urgency && swap.urgency !== 'normal' && (
                              <Badge className={
                                swap.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                swap.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }>
                                {swap.urgency}
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1">
                            {swap.swap_type === 'specific' ? 'Specific Swap Request' : 'Auto Assignment Request'}
                          </h4>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {swap.reason || 'No reason provided'}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {DAYS[swap.original_day]} - {SHIFTS[swap.original_shift]?.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(swap.created_at).toLocaleDateString()}
                            </span>
                            {swap.target_staff && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {swap.target_staff.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              
                              // Debug logging
                              console.log('🔍 View Details clicked!')
                              console.log('📊 Swap data:', swap)
                              console.log('📊 Before - selectedSwapForDetail:', selectedSwapForDetail)
                              console.log('📊 Before - showSwapDetailModal:', showSwapDetailModal)
                              
                              setSelectedSwapForDetail(swap)
                              setShowSwapDetailModal(true)
                              
                              // Check if state updated
                              setTimeout(() => {
                                console.log('📊 After setState should have updated')
                              }, 100)
                            }}
                          >
                            View Details
                          </Button>
                          
                          {swap.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Are you sure you want to cancel this swap request?')) {
                                  toast.info('Cancel functionality coming soon')
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {mySwapRequests.length > 0 && (
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowMySwapsModal(false)
                    onSwapRequest && onSwapRequest(0, 0, user?.staff_id || user?.id)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Swap Request
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/*Swap details modal */}
      <SwapDetailModal
        swap={selectedSwapForDetail}
        open={showSwapDetailModal && selectedSwapForDetail !== null}
        onClose={() => {
          console.log('🔍 SwapDetailModal onClose called')
          setShowSwapDetailModal(false)
          setSelectedSwapForDetail(null)
        }}
        onSwapResponse={async (swapId, accepted, notes) => {
          try {
            console.log('🔍 SwapResponse called:', { swapId, accepted, notes })
            await apiClient.respondToSwap(swapId, accepted, notes)
            setShowSwapDetailModal(false)
            setSelectedSwapForDetail(null)
            loadMyData() // Refresh the data
            toast.success(accepted ? 'Swap accepted!' : 'Swap declined')
          } catch (error) {
            console.error('❌ SwapResponse error:', error)
            toast.error('Failed to respond to swap')
          }
        }}
        onCancelSwap={async (swapId, reason) => {
          try {
            console.log('🔍 CancelSwap called:', { swapId, reason })
            await apiClient.cancelSwapRequest(swapId, reason)
            setShowSwapDetailModal(false)
            setSelectedSwapForDetail(null)
            loadMyData() // Refresh the data
            toast.success('Swap request cancelled')
          } catch (error) {
            console.error('❌ CancelSwap error:', error)
            toast.error('Failed to cancel swap')
          }
        }}
        user={user}
        apiClient={apiClient}
      />
    </div>
  )
}

// ============================================================================
// MANAGER VIEW COMPONENT (Your existing manager code)
// ============================================================================
function ManagerScheduleView({ 
  router,
  facilities,
  selectedFacility,
  setSelectedFacility,
  selectedZones,
  setSelectedZones,
  staff,
  schedules,
  currentSchedule,
  setCurrentSchedule,
  loading,
  setLoading,
  viewPeriod,
  setViewPeriod,
  currentDate,
  setCurrentDate,
  showStaffPanel,
  setShowStaffPanel,
  filterRole,
  setFilterRole,
  filterZone,
  setFilterZone,
  showSmartGenerateModal,
  setShowSmartGenerateModal,
  showConfigModal,
  setShowConfigModal,
  showScheduleListModal,
  setShowScheduleListModal,
  showSwapDashboard,
  setShowSwapDashboard,
  draggedStaff,
  setDraggedStaff,
  unsavedChanges,
  setUnsavedChanges,
  swapRequests,
  swapSummary,
  getFacilityZones,
  navigatePeriod,
  formatPeriodDisplay,
  getPeriodStart,
  handleAssignmentChange,
  handleRemoveAssignment,
  handleSmartGenerate,
  handleSaveSchedule,
  handleDeleteSchedule,
  handleScheduleSelect,
  handleSwapRequest,
  createSwapRequest,
  approveSwap,
  retryAutoAssignment,
  refreshSwaps,
  handleViewSwapHistory
}) {
  // Filter staff based on facility, zones, and roles
  const facilityStaff = staff.filter(member => 
    member.facility_id === selectedFacility?.id && member.is_active
  )

  const filteredStaff = facilityStaff.filter(member => {
    // Zone filter
    if (filterZone !== 'all' && selectedZones.length > 0) {
      const zones = getFacilityZones(selectedFacility)
      const zone = zones.find(z => z.id === filterZone)
      if (zone && zone.roles.length > 0 && !zone.roles.includes(member.role)) {
        return false
      }
    }
    
    // Role filter
    if (filterRole !== 'all' && !member.role.toLowerCase().includes(filterRole.toLowerCase())) {
      return false
    }
    
    return true
  })

  // Get available roles and zones
  const availableRoles = [...new Set(facilityStaff.map(member => member.role))]
  const availableZones = getFacilityZones(selectedFacility)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Manager Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Smart Schedule Management
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered scheduling with zone-based optimization
              </p>
            </div>
          </div>

          {/* Manager Header Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStaffPanel(!showStaffPanel)}
              className="gap-2"
            >
              {showStaffPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showStaffPanel ? 'Hide' : 'Show'} Staff
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Config
            </Button>
            
            <Button
              onClick={() => setShowSmartGenerateModal(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Zap className="w-4 h-4" />
              Smart Generate
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowScheduleListModal(true)}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Manage Schedules
              <Badge variant="secondary" className="ml-1">
                {schedules.length}
              </Badge>
            </Button>

            <Button 
              variant={showSwapDashboard ? "default" : "outline"}
              onClick={() => setShowSwapDashboard(!showSwapDashboard)} 
              className="relative"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Swaps
              {swapSummary?.pending_swaps > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5">
                  {swapSummary.pending_swaps}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Manager Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Facility & Zone Selection */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Facility & Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Facility Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Facility</label>
                <Select 
                  value={selectedFacility?.id || ''} 
                  onValueChange={(value) => {
                    const facility = facilities.find(f => f.id === value)
                    setSelectedFacility(facility)
                    if (facility) {
                      const zones = getFacilityZones(facility)
                      setSelectedZones(zones.map(z => z.id))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <option value="">Select a facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Zone Selection */}
              {selectedFacility && (
                <FacilityZoneSelector
                  zones={availableZones}
                  selectedZones={selectedZones}
                  onZoneChange={setSelectedZones}
                  staff={facilityStaff}
                />
              )}
            </CardContent>
          </Card>

          {/* Period Selection */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                View Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewPeriod} onValueChange={(value) => setViewPeriod(value as ViewPeriod)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod(-1)}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="text-xs"
                  >
                    Today
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod(1)}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm font-medium text-center mt-2">
                {formatPeriodDisplay(currentDate, viewPeriod)}
              </p>
            </CardContent>
          </Card>

          {/* Schedule Status */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentSchedule ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Schedule Active</p>
                      <p className="text-xs text-gray-500">
                        {currentSchedule.assignments?.length || 0} assignments
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">No Schedule</p>
                      <p className="text-xs text-gray-500">Generate or create schedule</p>
                    </div>
                  </div>
                )}
                
                {unsavedChanges && (
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    className="w-full gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                )}
                
                {selectedZones.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Active Zones:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedZones.map(zoneId => {
                        const zone = availableZones.find(z => z.id === zoneId)
                        return zone ? (
                          <Badge key={zoneId} variant="outline" className="text-xs">
                            {zone.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manager Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Staff Panel */}
          {showStaffPanel && (
            <div className="lg:col-span-1">
              <StaffAssignmentPanel
                staff={filteredStaff}
                availableRoles={availableRoles}
                availableZones={availableZones}
                filterRole={filterRole}
                filterZone={filterZone}
                onFilterChange={setFilterRole}
                onZoneFilterChange={setFilterZone}
                onDragStart={setDraggedStaff}
                onDragEnd={() => setDraggedStaff(null)}
              />
            </div>
          )}

          {/* Manager Calendar Views */}
          <div className={showStaffPanel ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {viewPeriod === 'daily' && (
              <DailyCalendar
                key={`manager-daily-${currentDate.getTime()}`}
                currentDate={currentDate}
                schedule={currentSchedule}
                staff={facilityStaff}
                shifts={SHIFTS}
                isManager={true}
                draggedStaff={draggedStaff}
                swapRequests={swapRequests}
                onSwapRequest={handleSwapRequest}
                onAssignmentChange={(shift, staffId) => {
                  const dayIndex = currentSchedule ? getCurrentDayIndex(currentSchedule, currentDate, 'daily') : 0
                  handleAssignmentChange(dayIndex, shift, staffId)
                }}
                onRemoveAssignment={handleRemoveAssignment}
              />
            )}
            
            {viewPeriod === 'weekly' && (
              <WeeklyCalendar
                key={`manager-weekly-${currentDate.getTime()}`} 
                currentWeek={getPeriodStart(currentDate, 'weekly')}
                schedule={currentSchedule}
                staff={facilityStaff}
                shifts={SHIFTS}
                days={DAYS}
                isManager={true}
                draggedStaff={draggedStaff}
                swapRequests={swapRequests}
                onSwapRequest={handleSwapRequest}
                onAssignmentChange={handleAssignmentChange}
                onRemoveAssignment={handleRemoveAssignment}
              />
            )}
            
            {viewPeriod === 'monthly' && (
              <MonthlyCalendar
                key={`manager-monthly-${getPeriodStart(currentDate, 'monthly').getTime()}`}
                currentMonth={getPeriodStart(currentDate, 'monthly')}
                schedules={schedules}
                staff={facilityStaff}
                isManager={true}
                swapRequests={swapRequests} 
                onDayClick={(date) => {
                  setCurrentDate(date)
                  setViewPeriod('daily')
                }}
              />
            )}
          </div>
        </div>

        {/* No Facility Selected */}
        {!selectedFacility && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Select a Facility</h3>
            <p className="text-gray-600">
              Choose a facility from the dropdown above to view and manage schedules
            </p>
          </div>
        )}
      </div>

      {/* Manager Modals */}
      <SmartGenerateModal
        open={showSmartGenerateModal}
        onClose={() => setShowSmartGenerateModal(false)}
        facility={selectedFacility}
        zones={availableZones}
        selectedZones={selectedZones}
        staff={facilityStaff}
        periodStart={getPeriodStart(currentDate, viewPeriod)}
        periodType={viewPeriod}
        onGenerate={handleSmartGenerate}
      />
      
      <ScheduleConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        facility={selectedFacility}
      />

      <ScheduleListModal
        open={showScheduleListModal}
        onClose={() => setShowScheduleListModal(false)}
        schedules={schedules}
        currentSchedule={currentSchedule}
        onScheduleSelect={handleScheduleSelect}
        onScheduleDelete={handleDeleteSchedule}
        isManager={true}
      />

      <FacilitySwapModal
        open={showSwapDashboard}
        onClose={() => setShowSwapDashboard(false)}
        facility={selectedFacility}
        swapRequests={swapRequests}
        swapSummary={swapSummary}
        days={DAYS}
        shifts={SHIFTS}
        onApproveSwap={approveSwap}
        onRetryAutoAssignment={retryAutoAssignment}
        onViewSwapHistory={handleViewSwapHistory}
        onRefresh={refreshSwaps}
      />
    </div>
  )
}

// Helper function to calculate the correct day index for a specific date within a schedule
const getCurrentDayIndex = (schedule, currentDate, viewPeriod) => {
  if (!schedule) return 0
  
  const scheduleStart = new Date(schedule.week_start)
  
  if (viewPeriod === 'daily') {
    const daysDiff = Math.floor((currentDate.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, Math.min(6, daysDiff))
  }
  
  return 0
}

// ============================================================================
// MAIN SCHEDULE PAGE COMPONENT - FIXED
// ============================================================================
export default function SchedulePage() {
  const router = useRouter()
  const { isManager, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const apiClient = useApiClient()
  
  // Core state
  const [facilities, setFacilities] = useState([])
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [selectedZones, setSelectedZones] = useState([])
  const [staff, setStaff] = useState([])
  const [schedules, setSchedules] = useState([])
  const [currentSchedule, setCurrentSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleListModal, setShowScheduleListModal] = useState(false)
  
  // View state
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showStaffPanel, setShowStaffPanel] = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [filterZone, setFilterZone] = useState('all')
  
  // Modal state
  const [showSmartGenerateModal, setShowSmartGenerateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  
  // Schedule editing state
  const [draggedStaff, setDraggedStaff] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Swaps states
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [selectedAssignmentForSwap, setSelectedAssignmentForSwap] = useState(null)
  const [showSwapDashboard, setShowSwapDashboard] = useState(false)

  // Get facility zones based on facility type
  const getFacilityZones = (facility) => {
    if (!facility) return FACILITY_ZONES.default
    
    const facilityName = facility.name.toLowerCase()
    if (facilityName.includes('hotel')) return FACILITY_ZONES.hotel
    if (facilityName.includes('restaurant') || facilityName.includes('bistro')) return FACILITY_ZONES.restaurant
    return FACILITY_ZONES.default
  }

  // FIXED: Only use swap hooks if manager or if facility is selected
  const {
  swapRequests,
  swapSummary,
  createSwapRequest,
  approveSwap,
  retryAutoAssignment,
  refresh: refreshSwaps
} = useSwapRequests(
  // Only managers get facility-level swap data
  // Staff will use their personal swap methods instead
  isManager && selectedFacility ? selectedFacility.id : undefined
)

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    }
  }, [authLoading, isAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      
      if (isManager) {
        // Load manager data
        const [facilitiesData, staffData] = await Promise.all([
          apiClient.getFacilities(),
          apiClient.getStaff()
        ])
        
        setFacilities(facilitiesData)
        setStaff(staffData)
        
        // Auto-select first facility for managers
        if (facilitiesData.length > 0) {
          setSelectedFacility(facilitiesData[0])
          const zones = getFacilityZones(facilitiesData[0])
          setSelectedZones(zones.map(z => z.id))
        }
      } else {
        // Load staff data - get their facility and schedule
        try {
          const staffProfile = await apiClient.getMyStaffProfile()
          const facility = await apiClient.getFacility(staffProfile.facility_id)
          const facilityStaff = await apiClient.getFacilityStaff(staffProfile.facility_id)
          
          setFacilities([facility])
          setSelectedFacility(facility)
          setStaff(facilityStaff)
          
          const zones = getFacilityZones(facility)
          setSelectedZones(zones.map(z => z.id))
        } catch (error) {
          console.error('Failed to load staff profile:', error)
          
          // Graceful fallback for staff without profile
          if (error.message?.includes('404')) {
            toast.error('Staff profile not found. Please contact your manager.')
          } else {
            toast.error('Failed to load your profile')
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  // Load schedules when facility or date changes
  useEffect(() => {
    if (selectedFacility) {
      loadSchedules()
    }
  }, [selectedFacility, currentDate, viewPeriod])

  // normalise data returned from API
  const normalizeAssignments = (assignments: any[]): any[] => {
    if (!assignments) {
      console.log('⚠️ No assignments provided, returning empty array')
      return []
    }
    
    console.log('🔧 Normalizing assignments:', assignments.length)
    
    const normalized = assignments.map((assignment, index) => {
      const normalized = {
        id: assignment.id || `assignment-${assignment.schedule_id || 'temp'}-${assignment.day}-${assignment.shift}-${assignment.staff_id}-${index}`,
        day: Number(assignment.day),
        shift: Number(assignment.shift),
        staff_id: String(assignment.staff_id),
        schedule_id: assignment.schedule_id,
        zone_id: assignment.zone_id,
        staff_name: assignment.staff_name,
        staff_role: assignment.staff_role
      }
      
      console.log(` Assignment ${index}:`, normalized)
      return normalized
    })
    
    console.log(' Normalized assignments complete:', normalized.length)
    return normalized
  }

  const loadSchedules = async () => {
    if (!selectedFacility) {
      console.log('No facility selected, skipping schedule load')
      return
    }
    
    try {
      console.log('🔄 Loading schedules for facility:', selectedFacility.name)
      console.log('📅 Current context:', {
        currentDate: currentDate.toDateString(),
        viewPeriod,
        currentScheduleId: currentSchedule?.id
      })
      
      const schedulesData = await apiClient.getFacilitySchedules(selectedFacility.id)
      
      console.log('📊 Raw API response:', {
        schedulesCount: schedulesData.length,
        schedules: schedulesData.map(s => ({
          id: s.id,
          week_start: s.week_start,
          assignments_count: s.assignments?.length || 0
        }))
      })
      
      // Normalize schedule data and ensure assignments exist
      const normalizedSchedules = schedulesData.map(schedule => {
        const normalized = {
          ...schedule,
          week_start: schedule.week_start.split('T')[0],
          assignments: normalizeAssignments(schedule.assignments || [])
        }
        
        console.log(`📋 Normalized schedule ${schedule.id}:`, {
          original_week_start: schedule.week_start,
          normalized_week_start: normalized.week_start,
          assignments_count: normalized.assignments.length
        })
        
        return normalized
      })
      
      console.log('✅ Schedules normalized:', normalizedSchedules.length)
      setSchedules(normalizedSchedules)
      
      // Find schedule for current period using improved logic
      const currentPeriodSchedule = findScheduleForCurrentPeriod(normalizedSchedules, currentDate, viewPeriod)
      
      console.log('🔍 SEARCH RESULT:', currentPeriodSchedule ? {
        found: true,
        id: currentPeriodSchedule.id,
        week_start: currentPeriodSchedule.week_start,
        assignments_count: currentPeriodSchedule.assignments?.length || 0
      } : {
        found: false,
        reason: 'No matching schedule found'
      })
      
      // Handle unsaved changes more carefully (only for managers)
      if (isManager && unsavedChanges && currentSchedule) {
        console.log('⚠️ UNSAVED CHANGES DETECTED - ENTERING SPECIAL LOGIC')
        
        const isGeneratedSchedule = currentSchedule.id?.includes('temp') || 
                                  currentSchedule.id?.includes('generated') || 
                                  currentSchedule.is_generated === true
        
        console.log('🔧 Generated schedule check:', {
          isGeneratedSchedule,
          id: currentSchedule.id,
          is_generated_flag: currentSchedule.is_generated
        })
        
        // Check if we're navigating to a different period
        let isDifferentPeriod = false
        try {
          const currentPeriodStart = getPeriodStart(new Date(currentSchedule.week_start), viewPeriod)
          const newPeriodStart = getPeriodStart(currentDate, viewPeriod)
          isDifferentPeriod = currentPeriodStart.toDateString() !== newPeriodStart.toDateString()
        } catch (error) {
          console.error('❌ Error comparing periods:', error)
          isDifferentPeriod = false
        }
        
        if (isGeneratedSchedule && !isDifferentPeriod) {
          console.log('✋ PRESERVING generated schedule for same period - RETURNING EARLY')
          return
        } else if (isDifferentPeriod) {
          console.log('🔀 Period changed - prompting user for unsaved changes')
          
          const shouldDiscard = window.confirm(
            'You have unsaved changes. Do you want to discard them and view the other period?'
          )
          
          if (!shouldDiscard) {
            console.log('🚫 User chose to keep unsaved changes - reverting navigation')
            return
          } else {
            console.log('✅ User chose to discard unsaved changes')
            setUnsavedChanges(false)
          }
        }
      }
      
      // Update the current schedule
      console.log('📝 SETTING current schedule to:', currentPeriodSchedule?.id || 'null')
      setCurrentSchedule(currentPeriodSchedule || null)
      
      if (currentPeriodSchedule) {
        setUnsavedChanges(false)
        console.log('✅ SUCCESS: Schedule found and should be set')
      } else {
        console.log('❌ NO SCHEDULE FOUND for current period')
        if (!unsavedChanges) {
          setUnsavedChanges(false)
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load schedules:', error)
      setSchedules([])
      
      if (!unsavedChanges) {
        setCurrentSchedule(null)
      }
    }
  }

  // Helper function to find schedules
  const findScheduleForCurrentPeriod = (schedules, currentDate, viewPeriod) => {
    console.log('🔍 Finding schedule for:', {
      currentDate: currentDate.toDateString(),
      viewPeriod,
      available_schedules: schedules.map(s => ({ 
        id: s.id, 
        week_start: s.week_start,
        week_end: getWeekEndDate(s.week_start).toDateString()
      }))
    })
    
    // For daily and weekly views, find schedule that contains the current date
    if (viewPeriod === 'daily' || viewPeriod === 'weekly') {
      const targetDate = viewPeriod === 'weekly' ? getPeriodStart(currentDate, 'weekly') : currentDate
      
      return schedules.find(schedule => {
        const scheduleStart = new Date(schedule.week_start)
        const scheduleEnd = getWeekEndDate(schedule.week_start)
        
        const targetDateStr = targetDate.toDateString()
        const scheduleStartStr = scheduleStart.toDateString()
        const scheduleEndStr = scheduleEnd.toDateString()
        
        const isWithinRange = (
          targetDateStr === scheduleStartStr || 
          targetDateStr === scheduleEndStr || 
          (targetDate > scheduleStart && targetDate < scheduleEnd)
        )
        
        return isWithinRange
      })
    }
    
    // For monthly view, find any schedule that overlaps with the month
    if (viewPeriod === 'monthly') {
      const monthStart = getPeriodStart(currentDate, 'monthly')
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      
      return schedules.find(schedule => {
        const scheduleStart = new Date(schedule.week_start)
        const scheduleEnd = getWeekEndDate(schedule.week_start)
        
        const overlaps = (scheduleStart <= monthEnd && scheduleEnd >= monthStart)
        return overlaps
      })
    }
    
    return null
  }

  // Helper function to get the end date of a week (6 days after start)
  const getWeekEndDate = (weekStartString) => {
    const weekStart = new Date(weekStartString)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
  }

  // Helper functions for date navigation
  const getPeriodStart = (date: Date, period: ViewPeriod) => {
    const result = new Date(date)
    
    switch (period) {
      case 'daily':
        return result
      case 'weekly':
        const dayOfWeek = result.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        result.setDate(result.getDate() - daysToMonday)
        return result
      case 'monthly':
        result.setDate(1)
        return result
    }
  }

  const navigatePeriod = (direction: number) => {
    // Check for unsaved changes before navigation (only for managers)
    if (isManager && unsavedChanges && currentSchedule) {
      const isGeneratedSchedule = currentSchedule.id?.includes('temp') || 
                                currentSchedule.id?.includes('generated') || 
                                currentSchedule.is_generated
      
      if (isGeneratedSchedule) {
        const shouldDiscard = window.confirm(
          'You have an unsaved generated schedule. Do you want to save it before navigating?'
        )
        
        if (shouldDiscard) {
          handleSaveSchedule().then(() => {
            performNavigation(direction)
          }).catch((error) => {
            console.error('Save failed:', error)
            toast.error('Failed to save schedule')
          })
          return
        }
      }
    }
    
    performNavigation(direction)
  }

  const performNavigation = (direction: number) => {
    const newDate = new Date(currentDate)
    
    switch (viewPeriod) {
      case 'daily':
        newDate.setDate(currentDate.getDate() + direction)
        break
      case 'weekly':
        newDate.setDate(currentDate.getDate() + (direction * 7))
        break
      case 'monthly':
        newDate.setMonth(currentDate.getMonth() + direction)
        break
    }
    
    setCurrentDate(newDate)
    setUnsavedChanges(false)
  }

  const formatPeriodDisplay = (date: Date, period: ViewPeriod) => {
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'weekly':
        const weekStart = getPeriodStart(date, 'weekly')
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
  }

  // Handle assignments (Manager only)
  const handleAssignmentChange = (day: number, shift: number, staffId: string) => {
    if (!isManager) return // Staff can't modify assignments
    
    console.log('Assignment change called:', { day, shift, staffId })
    setUnsavedChanges(true)
    
    if (!currentSchedule) {
      const newSchedule = {
        id: `temp-schedule-${Date.now()}`,
        facility_id: selectedFacility?.id,
        week_start: getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0],
        assignments: []
      }

      const newAssignment = {
        id: `temp-assignment-${Date.now()}`,
        day,
        shift,
        staff_id: staffId
      }
      
      newSchedule.assignments.push(newAssignment)
      setCurrentSchedule(newSchedule)
      
      const staffMember = staff.find(s => s.id === staffId)
      const shiftName = SHIFTS.find(s => s.id === shift)?.name || 'Shift'
      const dayName = DAYS[day] || 'Day'
      
      if (staffMember) {
        toast.success(`${staffMember.full_name} assigned to ${dayName} ${shiftName}`)
      }
      return
    }

    // Check if staff is already assigned to this day/shift
    const existingAssignment = currentSchedule.assignments?.find(a => 
      a.day === day && a.shift === shift && a.staff_id === staffId
    )
    
    if (existingAssignment) {
      toast.error('Staff member is already assigned to this shift')
      return
    }
    
    // Create new assignment
    const newAssignment = {
      id: `temp-assignment-${Date.now()}`,
      day,
      shift,
      staff_id: staffId
    }
    
    setCurrentSchedule(prevSchedule => {
      if (!prevSchedule) return prevSchedule
      
      const updatedSchedule = {
        ...prevSchedule,
        assignments: [...(prevSchedule.assignments || []), newAssignment]
      }
      
      return updatedSchedule
    })
    
    const staffMember = staff.find(s => s.id === staffId)
    const shiftName = SHIFTS.find(s => s.id === shift)?.name || 'Shift'
    const dayName = DAYS[day] || 'Day'
    
    if (staffMember) {
      toast.success(`${staffMember.full_name} assigned to ${dayName} ${shiftName}`)
    }
  }

  const handleRemoveAssignment = (assignmentId: string) => {
    if (!isManager) return // Staff can't remove assignments
    
    console.log('Remove assignment called:', assignmentId)
    setUnsavedChanges(true)
    
    if (!currentSchedule) return
    
    const assignmentToRemove = currentSchedule.assignments?.find(a => a.id === assignmentId)
    
    setCurrentSchedule(prevSchedule => {
      if (!prevSchedule) return prevSchedule
      
      const updatedSchedule = {
        ...prevSchedule,
        assignments: prevSchedule.assignments?.filter(a => a.id !== assignmentId) || []
      }
      
      return updatedSchedule
    })
    
    if (assignmentToRemove) {
      const staffMember = staff.find(s => s.id === assignmentToRemove.staff_id)
      if (staffMember) {
        toast.success(`${staffMember.full_name} removed from schedule`)
      }
    }
  }

  const handleSmartGenerate = async (config) => {
    if (!isManager) return
    
    console.log('Smart generate started with config:', config)
    
    if (!selectedFacility) {
      toast.error('Please select a facility first')
      return
    }
    
    try {
      const periodStart = getPeriodStart(currentDate, viewPeriod)
      
      const requestData = {
        facility_id: selectedFacility.id,
        period_start: periodStart.toISOString().split('T')[0],
        period_type: viewPeriod,
        zones: selectedZones,
        role_mapping: config.role_mapping || {},
        use_constraints: config.use_constraints,
        ...config
      }
      
      const result = await apiClient.generateSmartSchedule(requestData)
      
      if (!result || !result.assignments) {
        throw new Error('Invalid response: no assignments generated')
      }
      
      const scheduleData = {
        id: `temp-generated-${Date.now()}`,
        facility_id: selectedFacility.id,
        week_start: periodStart.toISOString().split('T')[0],
        assignments: normalizeAssignments(result.assignments),
        created_at: new Date().toISOString(),
        is_generated: true,
        zone_coverage: result.zone_coverage || {},
        optimization_metrics: result.optimization_metrics || {},
        ...result
      }
      
      setCurrentSchedule(scheduleData)
      setUnsavedChanges(true)
      
      const periodName = viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)
      const assignmentCount = scheduleData.assignments.length
      
      toast.success(`${periodName} schedule generated successfully! ${assignmentCount} assignments created. Click "Save Changes" to persist.`)
      
    } catch (error) {
      console.error('Smart generate failed:', error)
      
      let errorMessage = 'Failed to generate schedule'
      
      if (error.message?.includes('fetch')) {
        errorMessage = 'Network error - check if backend is running'
      } else if (error.message?.includes('404')) {
        errorMessage = 'Smart scheduling endpoint not found'
      } else if (error.message?.includes('422')) {
        errorMessage = 'Invalid scheduling parameters'
      } else if (error.message) {
        errorMessage = `Generation failed: ${error.message}`
      }
      
      toast.error(errorMessage)
    }
  }

  const handleSaveSchedule = async () => {
    if (!isManager) return
    
    console.log('SAVE SCHEDULE STARTED')
    
    if (!currentSchedule) {
      toast.error('No schedule to save')
      return
    }
    
    try {
      let savedSchedule
      
      const isNewSchedule = !currentSchedule.id || 
                          currentSchedule.id.includes('temp') || 
                          currentSchedule.id.includes('generated') ||
                          currentSchedule.is_generated === true
      
      if (isNewSchedule) {
        const scheduleToSave = {
          facility_id: currentSchedule.facility_id,
          week_start: currentSchedule.week_start,
          assignments: currentSchedule.assignments || []
        }
        
        savedSchedule = await apiClient.createSchedule(scheduleToSave)
      } else {
        const updateData = {
          assignments: currentSchedule.assignments || []
        }
        
        savedSchedule = await apiClient.updateSchedule(currentSchedule.id, updateData)
      }

      savedSchedule = {
        ...savedSchedule,
        assignments: normalizeAssignments(savedSchedule.assignments || []),
        is_generated: false
      }
      
      setCurrentSchedule(savedSchedule)
      setUnsavedChanges(false)
      
      await loadSchedules()
      
      toast.success('Schedule saved successfully!')
      
    } catch (error) {
      console.error('SAVE FAILED:', error)
      
      let errorMessage = 'Failed to save schedule'
      
      if (error.message?.includes('404')) {
        errorMessage = 'Schedule not found - it may have been deleted'
      } else if (error.message?.includes('405')) {
        errorMessage = 'Save endpoint not available - check backend configuration'
      } else if (error.message?.includes('403')) {
        errorMessage = 'Permission denied - check authentication'
      } else if (error.message?.includes('422')) {
        errorMessage = 'Invalid schedule data'
      } else if (error.message) {
        errorMessage = `Save failed: ${error.message}`
      }
      
      toast.error(errorMessage)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!isManager) return
    
    try {
      await apiClient.deleteSchedule(scheduleId)
      
      setSchedules(prev => prev.filter(s => s.id !== scheduleId))
      
      if (currentSchedule?.id === scheduleId) {
        setCurrentSchedule(null)
        setUnsavedChanges(false)
      }
      
      toast.success('Schedule deleted successfully')
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      throw error
    }
  }

  const handleScheduleSelect = (schedule: any) => {
    if (!isManager) return
    
    if (unsavedChanges && currentSchedule) {
      const shouldDiscard = window.confirm(
        'You have unsaved changes. Do you want to discard them and switch to the selected schedule?'
      )
      
      if (!shouldDiscard) {
        return
      }
    }

    const scheduleDate = new Date(schedule.week_start)
    setCurrentDate(scheduleDate)
    setCurrentSchedule(schedule)
    setUnsavedChanges(false)
    
    if (viewPeriod !== 'weekly') {
      setViewPeriod('weekly')
    }
    
    toast.success(`Switched to schedule for ${scheduleDate.toLocaleDateString()}`)
  }

  const handleSwapRequest = (day: number, shift: number, staffId: string) => {
    setSelectedAssignmentForSwap({ day, shift, staffId })
    setShowSwapModal(true)
  }

  const handleViewSwapHistory = (swapId: string) => {
    console.log('View swap history for:', swapId)
    // TODO: implement a swap history modal here
  }

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading schedule data...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {isManager ? (
        <ManagerScheduleView
          router={router}
          facilities={facilities}
          selectedFacility={selectedFacility}
          setSelectedFacility={setSelectedFacility}
          selectedZones={selectedZones}
          setSelectedZones={setSelectedZones}
          staff={staff}
          schedules={schedules}
          currentSchedule={currentSchedule}
          setCurrentSchedule={setCurrentSchedule}
          loading={loading}
          setLoading={setLoading}
          viewPeriod={viewPeriod}
          setViewPeriod={setViewPeriod}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          showStaffPanel={showStaffPanel}
          setShowStaffPanel={setShowStaffPanel}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          filterZone={filterZone}
          setFilterZone={setFilterZone}
          showSmartGenerateModal={showSmartGenerateModal}
          setShowSmartGenerateModal={setShowSmartGenerateModal}
          showConfigModal={showConfigModal}
          setShowConfigModal={setShowConfigModal}
          showScheduleListModal={showScheduleListModal}
          setShowScheduleListModal={setShowScheduleListModal}
          showSwapDashboard={showSwapDashboard}
          setShowSwapDashboard={setShowSwapDashboard}
          draggedStaff={draggedStaff}
          setDraggedStaff={setDraggedStaff}
          unsavedChanges={unsavedChanges}
          setUnsavedChanges={setUnsavedChanges}
          swapRequests={swapRequests}
          swapSummary={swapSummary}
          getFacilityZones={getFacilityZones}
          navigatePeriod={navigatePeriod}
          formatPeriodDisplay={formatPeriodDisplay}
          getPeriodStart={getPeriodStart}
          handleAssignmentChange={handleAssignmentChange}
          handleRemoveAssignment={handleRemoveAssignment}
          handleSmartGenerate={handleSmartGenerate}
          handleSaveSchedule={handleSaveSchedule}
          handleDeleteSchedule={handleDeleteSchedule}
          handleScheduleSelect={handleScheduleSelect}
          handleSwapRequest={handleSwapRequest}
          createSwapRequest={createSwapRequest}
          approveSwap={approveSwap}
          retryAutoAssignment={retryAutoAssignment}
          refreshSwaps={refreshSwaps}
          handleViewSwapHistory={handleViewSwapHistory}
        />
      ) : (
        <StaffScheduleView
          currentDate={currentDate}
          viewPeriod={viewPeriod}
          setCurrentDate={setCurrentDate}
          setViewPeriod={setViewPeriod}
          navigatePeriod={navigatePeriod}
          formatPeriodDisplay={formatPeriodDisplay}
          schedules={schedules}
          staff={staff}
          currentSchedule={currentSchedule}
          swapRequests={swapRequests}
          onSwapRequest={handleSwapRequest}
          user={user}
        />
      )}

      {/* Swap Request Modal - Available for both staff and managers */}
      <SwapRequestModal
        open={showSwapModal}
        onClose={() => {
          setShowSwapModal(false)
          setSelectedAssignmentForSwap(null)
        }}
        schedule={currentSchedule}
        currentAssignment={selectedAssignmentForSwap}
        staff={staff}
        shifts={SHIFTS}
        days={DAYS}
        isManager={isManager}
        onSwapRequest={createSwapRequest}
      />
    </AppLayout>
  )
}