// schedule/page.tsx - FIXED VERSION with proper data loading and modal state management
'use client'

import { useState, useEffect, useMemo } from 'react'
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
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSwapRequests } from '@/hooks/useSwapRequests'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScheduleSaveConfirmationDialog } from '@/components/schedule/ScheduleSaveConfirmationDialog'
import { SwapNotificationDialog } from '@/components/swap/SwapNotificationDialog'
import React from 'react'

type ViewPeriod = 'daily' | 'weekly' | 'monthly'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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
  user,
  facility,
  shifts,
  zones
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

  const loadMyData = async () => {
    try {
      console.log('=== LOADING STAFF DATA ===')
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

      console.log('Staff data date range:', {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      })

      // FIXED: Use existing getMySchedule method
      try {
        const scheduleData = await apiClient.getMySchedule(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )

        console.log('Staff schedule data received:', scheduleData)

        // Handle the correct response structure from backend
        if (scheduleData && scheduleData.assignments) {
          setMyScheduleData(scheduleData)
          console.log('Staff schedule loaded:', {
            assignments_count: scheduleData.assignments.length,
            sample_assignments: scheduleData.assignments.slice(0, 3)
          })
        } else {
          console.log('No staff schedule data found')
          setMyScheduleData({ assignments: [] })
        }
      } catch (error) {
        console.warn('getMySchedule failed:', error)
        setMyScheduleData({ assignments: [] })
      }

      // Get swap requests for staff
      try {
        const swaps = await apiClient.getMySwapRequests(undefined, 50)
        console.log('Staff swap requests loaded:', swaps.length)
        setMySwapRequests(swaps)
      } catch (error) {
        console.warn('Failed to load my swap requests:', error)
        setMySwapRequests([])
      }

    } catch (error) {
      console.error('Failed to load staff data:', error)
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

  // Get assignments to display
  const getAssignmentsForDisplay = () => {
    if (!myScheduleData || !myScheduleData.assignments) {
      return []
    }
    return myScheduleData.assignments
  }

  // shift colors
  const generateShiftColor = (index: number): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green  
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316'  // Orange-red
  ]
  return colors[index % colors.length]
}


  // Get shift names
  const getShiftName = (shiftIndex) => {
    console.log('🔍 Looking for shift name:', shiftIndex, 'in shifts:', shifts)
    
    // Try multiple matching strategies
    const shift = shifts?.find(s => 
      s.shift_index === shiftIndex || 
      s.id === shiftIndex || 
      s.shift_index === parseInt(shiftIndex) ||
      s.id === parseInt(shiftIndex)
    )
    
    const shiftName = shift?.name || `Shift ${shiftIndex}`
    console.log(' Found shift name:', shiftName, 'for index:', shiftIndex)
    
    return shiftName
  }

  const getShiftTime = (shiftIndex) => {
    const shift = shifts?.find(s => 
      s.shift_index === shiftIndex || 
      s.id === shiftIndex ||
      s.shift_index === parseInt(shiftIndex) ||
      s.id === parseInt(shiftIndex)
    )
    
    const timeDisplay = shift ? `${shift.start_time} - ${shift.end_time}` : ''
    console.log('Shift time for', shiftIndex, ':', timeDisplay)
    
    return timeDisplay
  }
    
  // Get current assignments
  const getTodayAssignments = () => {
    // Use the new data structure
    const assignments = getAssignmentsForDisplay()
    if (!assignments.length) return []

    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0] // Format: "2025-07-16"

    // Filter by actual date instead of day index
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
              {facility && (
                <p className="text-sm text-gray-500">📍 {facility.name}</p>
              )}
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
                      // FIXED: Use dynamic shift lookup instead of SHIFTS constant
                      const shift = shifts.find(s => 
                        s.id === assignment.shift || 
                        s.shift_index === assignment.shift ||
                        s.id === parseInt(String(assignment.shift))
                      )
                      return (
                        <div key={assignment.assignment_id} className="text-xs text-green-700">
                          {shift?.name || getShiftName(assignment.shift)} ({shift?.time || getShiftTime(assignment.shift)})
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
              shifts={shifts}
              isManager={false}
              draggedStaff={null}
              swapRequests={swapRequests}
              onSwapRequest={onSwapRequest}
              onAssignmentChange={() => {}}
              onRemoveAssignment={() => {}}
            />
          )}
          
          {viewPeriod === 'weekly' && (
            <WeeklyCalendar
              key={`staff-weekly-${currentDate.getTime()}`}
              currentWeek={getPeriodStart(currentDate, 'weekly')}
              schedule={currentSchedule}
              staff={staff}
              shifts={shifts}
              days={DAYS}
              isManager={false}
              draggedStaff={null}
              swapRequests={swapRequests}
              onSwapRequest={onSwapRequest}
              onAssignmentChange={() => {}}
              onRemoveAssignment={() => {}}
            />
          )}
          
          {viewPeriod === 'monthly' && (
            <MonthlyCalendar
              key={`staff-monthly-${getPeriodStart(currentDate, 'monthly').getTime()}`}
              currentMonth={getPeriodStart(currentDate, 'monthly')}
              schedules={schedules}
              staff={staff}
              shifts={shifts}
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

      {/* My Swaps List Modal - FIX: Only show when state is true */}
      {showMySwapsModal && (
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
                                {DAYS[swap.original_day]} - {shifts?.find(s => s.id === swap.original_shift)?.name || 'Unknown Shift'}
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
                                setSelectedSwapForDetail(swap)
                                setShowSwapDetailModal(true)
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
      )}

      {/* Swap details modal - FIX: Only show when both conditions are true */}
      {showSwapDetailModal && selectedSwapForDetail && (
        <SwapDetailModal
          swap={selectedSwapForDetail}
          open={showSwapDetailModal}
          onClose={() => {
            setShowSwapDetailModal(false)
            setSelectedSwapForDetail(null)
          }}
          onSwapResponse={async (swapId, accepted, notes) => {
            try {
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
      )}
    </div>
  )
}

// ============================================================================
// MANAGER VIEW COMPONENT  
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
  handleViewSwapHistory,
  shifts,
  zones,
  showSaveDialog,
  setShowSaveDialog,
  showSwapNotificationDialog,
  setShowSwapNotificationDialog,
  processSwapWithNotifications,
  pendingSwapData
}) {
  // Filter staff based on facility, zones, and roles
  const facilityStaff = staff.filter(member => 
    member.facility_id === selectedFacility?.id && member.is_active
  )

  const filteredStaff = facilityStaff.filter(member => {
    // Zone filter
    if (filterZone !== 'all' && selectedZones.length > 0) {
      const zone = zones.find(z => z.zone_id === filterZone)
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
  const availableZones = zones || []

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
              {selectedFacility && (
                <p className="text-sm text-gray-500">📍 {selectedFacility.name}</p>
              )}
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
                    if (facility?.zones) {
                      setSelectedZones(facility.zones.map(z => z.zone_id || z.id))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name} ({facility.facility_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zone Selection */}
              {selectedFacility && zones?.length > 0 && (
                <FacilityZoneSelector
                  zones={availableZones}
                  selectedZones={selectedZones}
                  onZoneChange={setSelectedZones}
                  staff={facilityStaff}
                />
              )}

              {/* Facility Info */}
              {selectedFacility && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span className="font-medium">{selectedFacility.facility_type}</span>
                    <span>•</span>
                    <span>{zones?.length || 0} zones</span>
                    <span>•</span>
                    <span>{shifts?.length || 0} shifts</span>
                  </div>
                </div>
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
                
                {selectedZones.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Active Zones:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedZones.map(zoneId => {
                        const zone = availableZones.find(z => (z.zone_id || z.id) === zoneId)
                        return zone ? (
                          <Badge key={zoneId} variant="outline" className="text-xs">
                            {zone.zone_name || zone.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
                
                {/* Save Button */}
                {currentSchedule && (
                  <Button
                    onClick={() => setShowSaveDialog(true)}
                    disabled={!unsavedChanges}
                    className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Save className="w-4 h-4" />
                    {unsavedChanges ? 'Publish Changes' : 'Saved'}
                  </Button>
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
                shifts={shifts}
                isManager={true}
                draggedStaff={draggedStaff}
                swapRequests={swapRequests}
                onSwapRequest={handleSwapRequest}
                onAssignmentChange={(shift, staffId) => {
                  const dayIndex = getCurrentDayIndex(currentSchedule, currentDate, 'daily')
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
                shifts={shifts}
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
                shifts={shifts}
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

      {/* Manager Modals - FIX: Only render when needed */}
      {showSmartGenerateModal && (
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
      )}
      
      {showConfigModal && (
        <ScheduleConfigModal
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          facility={selectedFacility}
        />
      )}

      {showScheduleListModal && (
        <ScheduleListModal
          open={showScheduleListModal}
          onClose={() => setShowScheduleListModal(false)}
          schedules={schedules}
          currentSchedule={currentSchedule}
          onScheduleSelect={handleScheduleSelect}
          onScheduleDelete={handleDeleteSchedule}
          isManager={true}
        />
      )}

      {showSwapDashboard && (
        <FacilitySwapModal
          open={showSwapDashboard}
          onClose={() => setShowSwapDashboard(false)}
          facility={selectedFacility}
          swapRequests={swapRequests}
          swapSummary={swapSummary}
          days={DAYS}
          shifts={shifts}
          onApproveSwap={approveSwap}
          onRetryAutoAssignment={retryAutoAssignment}
          onViewSwapHistory={handleViewSwapHistory}
          onRefresh={refreshSwaps}
        />
      )}

      {/* Save Confirmation Dialog - FIX: Only render when needed */}
      {showSaveDialog && (
        <ScheduleSaveConfirmationDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onConfirm={handleSaveSchedule}
          schedule={currentSchedule}
          staffList={facilityStaff}
          facility={selectedFacility}
          isNewSchedule={!currentSchedule?.id || currentSchedule?.is_generated}
        />
      )}

      {/* Swap Notification Dialog - FIX: Only render when needed */}
      {showSwapNotificationDialog && pendingSwapData && (
        <SwapNotificationDialog
          open={showSwapNotificationDialog}
          onClose={() => setShowSwapNotificationDialog(false)}
          onConfirm={processSwapWithNotifications}
          swapType="staff_to_staff"
          swapDetails={{
            requesterName: pendingSwapData?.requester_name || 'Unknown',
            targetStaffName: pendingSwapData?.target_staff_name,
            originalDay: pendingSwapData?.original_day_name || 'Unknown',
            originalShift: pendingSwapData?.original_shift_name || 'Unknown',
            reason: pendingSwapData?.reason,
            urgency: pendingSwapData?.urgency || 'normal'
          }}
          recipientStaff={facilityStaff.filter(s => 
            pendingSwapData?.target_staff_id ? 
            s.id === pendingSwapData.target_staff_id : 
            true
          )}
        />
      )}
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
// MAIN SCHEDULE PAGE COMPONENT - FIXED VERSION
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
  
  // Dynamic facility data
  const [shifts, setShifts] = useState([])
  const [zones, setZones] = useState([])
  
  // View state
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showStaffPanel, setShowStaffPanel] = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [filterZone, setFilterZone] = useState('all')
  
  // Modal state - FIX: Initialize to false to prevent auto-opening
  const [showSmartGenerateModal, setShowSmartGenerateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  
  // Schedule editing state
  const [draggedStaff, setDraggedStaff] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Swaps states
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [selectedAssignmentForSwap, setSelectedAssignmentForSwap] = useState(null)
  const [showSwapDashboard, setShowSwapDashboard] = useState(false)
  const [facilitiesReady, setFacilitiesReady] = useState(false)

  // Notification states - FIX: Initialize to false
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSwapNotificationDialog, setShowSwapNotificationDialog] = useState(false)
  const [pendingSwapData, setPendingSwapData] = useState(null)

  // Manager facility ID for swap hooks
  const managerFacilityId = useMemo(() => {
    if (!isManager || !facilitiesReady) {
      return undefined
    }
    
    if (!selectedFacility?.id) {
      return undefined
    }
    
    return selectedFacility.id
  }, [isManager, facilitiesReady, selectedFacility])

  const {
    swapRequests,
    swapSummary,
    createSwapRequest,
    approveSwap,
    retryAutoAssignment,
    refresh: refreshSwaps
  } = useSwapRequests(managerFacilityId)

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    }
  }, [authLoading, isAuthenticated])

  // Load facility-specific data when facility changes
  useEffect(() => {
    if (selectedFacility) {
      loadFacilityData()
    }
  }, [selectedFacility])

  const loadData = async () => {
    try {
      console.log('=== LOAD DATA STARTED ===')
      setLoading(true)
      setFacilitiesReady(false)
      
      if (isManager) {
        console.log('Loading manager data...')
        const [facilitiesData, staffData] = await Promise.all([
          apiClient.getFacilities(),
          apiClient.getStaff()
        ])

        console.log('Facilities loaded:', facilitiesData)
        setFacilities(facilitiesData)
        setStaff(staffData)
        
        if (facilitiesData.length > 0) {
          console.log('Auto-selecting first facility:', facilitiesData[0])
          setSelectedFacility(facilitiesData[0])
          setFacilitiesReady(true)
        }
      } else {
        // Load staff data
        try {
          const staffProfile = await apiClient.getMyStaffProfile()
          const facility = await apiClient.getFacility(staffProfile.facility_id)
          const facilityStaff = await apiClient.getFacilityStaff(staffProfile.facility_id)
          
          setFacilities([facility])
          setSelectedFacility(facility)
          setStaff(facilityStaff)
        } catch (error) {
          console.error('Failed to load staff profile:', error)
          toast.error('Failed to load your profile')
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  //  Load facility-specific shifts and zones
  const loadFacilityData = async () => {
    if (!selectedFacility) return

    try {
      console.log('🏢 Loading facility data for:', selectedFacility.name)
      
      // CRITICAL: Load real shifts from API instead of using SHIFTS constant
      let facilityShifts = []
      try {
        facilityShifts = await apiClient.getFacilityShifts(selectedFacility.id)
        console.log('Real shifts from API:', facilityShifts)
      } catch (error) {
        console.warn('Failed to load shifts from API, using fallback:', error)
        // Fallback to the working SHIFTS constant format
        facilityShifts = [
          { id: 0, name: 'Morning', start_time: '06:00', end_time: '14:00', color: '#3B82F6' },
          { id: 1, name: 'Afternoon', start_time: '14:00', end_time: '22:00', color: '#10B981' },
          { id: 2, name: 'Evening', start_time: '22:00', end_time: '06:00', color: '#F59E0B' }
        ]
      }

      // Process shifts to match the working format
      const processedShifts = facilityShifts.map((shift, index) => ({
        id: shift.id || index,
        name: shift.name || shift.shift_name || `Shift ${index + 1}`,
        start_time: shift.start_time || '09:00',
        end_time: shift.end_time || '17:00',
        color: shift.color || ['#3B82F6', '#10B981', '#F59E0B'][index] || '#3B82F6',
        time: `${shift.start_time || '09:00'} - ${shift.end_time || '17:00'}` // Add time field like SHIFTS
      }))

      console.log('📅 Processed shifts:', processedShifts)
      setShifts(processedShifts)

      // Load zones (keep your existing zone logic)
      const facilityZones = selectedFacility.zones || []
      setZones(facilityZones)

      if (facilityZones.length > 0) {
        setSelectedZones(facilityZones.map(z => z.zone_id || z.id))
      }

    } catch (error) {
      console.error('Failed to load facility data:', error)
      toast.error('Failed to load facility configuration')
    }
  }


  // normalize assignment data
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
      
      console.log(`Assignment ${index}:`, normalized)
      return normalized
    })
    
    console.log('✅ Normalized assignments complete:', normalized.length)
    return normalized
  }

  //  Load schedules when facility or date changes
  useEffect(() => {
    if (selectedFacility) {
      loadSchedules()
    }
  }, [selectedFacility, currentDate, viewPeriod])

  // FIXED: Implement loadSchedules properly
  const loadSchedules = async () => {
  if (!selectedFacility) {
    console.log('No facility selected, skipping schedule load')
    return
  }
  
  try {
    console.log('🔄 Loading schedules for facility:', selectedFacility.name)
    
    const schedulesData = await apiClient.getFacilitySchedules(selectedFacility.id)
    
    console.log('📊 Raw API response:', {
      schedulesCount: schedulesData.length,
      schedules: schedulesData.map(s => ({
        id: s.id,
        week_start: s.week_start,
        assignments_count: s.assignments?.length || 0
      }))
    })
    
    // CRITICAL: Normalize schedule data using your working function
    const normalizedSchedules = schedulesData.map(schedule => {
      const normalized = {
        ...schedule,
        week_start: schedule.week_start.split('T')[0],
        assignments: normalizeAssignments(schedule.assignments || []) // THIS WAS KEY
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
    
    // Find schedule for current period
    const currentPeriodSchedule = findScheduleForCurrentPeriod(normalizedSchedules, currentDate, viewPeriod)
    
    console.log('🔍 Current schedule found:', currentPeriodSchedule?.id || 'none')
    setCurrentSchedule(currentPeriodSchedule || null)
    
  } catch (error) {
    console.error('❌ Failed to load schedules:', error)
    setSchedules([])
    setCurrentSchedule(null)
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

  // FIXED: Implement proper handler functions
  const handleAssignmentChange = async (dayIndex: number, shiftIndex: number, staffId: string) => {
    if (!currentSchedule) return

    try {
      console.log('📝 Assignment change:', { dayIndex, shiftIndex, staffId })
      
      // Create new assignment
      const newAssignment = {
        day: dayIndex,
        shift: shiftIndex,
        staff_id: staffId,
        schedule_id: currentSchedule.id
      }

      // Update local state immediately for responsiveness
      const updatedSchedule = {
        ...currentSchedule,
        assignments: [...(currentSchedule.assignments || []), newAssignment]
      }
      
      setCurrentSchedule(updatedSchedule)
      setUnsavedChanges(true)
      
      toast.success('Assignment added')
    } catch (error) {
      console.error('Failed to add assignment:', error)
      toast.error('Failed to add assignment')
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!currentSchedule) return

    try {
      console.log('🗑️ Removing assignment:', assignmentId)
      
      // Update local state
      const updatedSchedule = {
        ...currentSchedule,
        assignments: currentSchedule.assignments?.filter(a => a.id !== assignmentId) || []
      }
      
      setCurrentSchedule(updatedSchedule)
      setUnsavedChanges(true)
      
      toast.success('Assignment removed')
    } catch (error) {
      console.error('Failed to remove assignment:', error)
      toast.error('Failed to remove assignment')
    }
  }

  const handleSmartGenerate = async (config: any) => {
    try {
      setLoading(true)
      console.log('🤖 Smart generating schedule with config:', config)
      
      const generatedSchedule = await apiClient.generateSmartSchedule({
        facility_id: selectedFacility.id,
        period_start: getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0],
        period_type: viewPeriod,
        zones: selectedZones,
        ...config
      })

      console.log('✅ Schedule generated:', generatedSchedule)
      setCurrentSchedule(generatedSchedule)
      setUnsavedChanges(true)
      setShowSmartGenerateModal(false)
      
      toast.success('Smart schedule generated successfully!')
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      toast.error('Failed to generate schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSchedule = async () => {
    if (!currentSchedule) return

    try {
      console.log('💾 Saving schedule:', currentSchedule.id)
      
      if (currentSchedule.id && !currentSchedule.is_generated) {
        // Update existing schedule
        await apiClient.updateSchedule(currentSchedule.id, currentSchedule)
      } else {
        // Create new schedule
        const savedSchedule = await apiClient.createSchedule(currentSchedule)
        setCurrentSchedule(savedSchedule)
      }
      
      setUnsavedChanges(false)
      setShowSaveDialog(false)
      toast.success('Schedule saved successfully!')
      
      // Reload schedules
      loadSchedules()
    } catch (error) {
      console.error('Failed to save schedule:', error)
      toast.error('Failed to save schedule')
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      console.log('🗑️ Deleting schedule:', scheduleId)
      
      await apiClient.deleteSchedule(scheduleId)
      
      // Remove from local state
      setSchedules(schedules.filter(s => s.id !== scheduleId))
      
      // Clear current schedule if it was deleted
      if (currentSchedule?.id === scheduleId) {
        setCurrentSchedule(null)
        setUnsavedChanges(false)
      }
      
      toast.success('Schedule deleted successfully!')
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      toast.error('Failed to delete schedule')
    }
  }

  const handleScheduleSelect = (schedule: any) => {
    console.log('📋 Selecting schedule:', schedule.id)
    setCurrentSchedule(schedule)
    setUnsavedChanges(false)
    setShowScheduleListModal(false)
    
    // Update current date to match schedule
    if (schedule.week_start) {
      setCurrentDate(new Date(schedule.week_start))
    }
  }

  const handleSwapRequest = (dayIndex: number, shiftIndex: number, staffId: string) => {
    console.log('🔄 Swap request:', { dayIndex, shiftIndex, staffId })
    
    // Set up swap request data
    setSelectedAssignmentForSwap({
      day: dayIndex,
      shift: shiftIndex,
      staff_id: staffId,
      schedule_id: currentSchedule?.id
    })
    
    setShowSwapModal(true)
  }

  const handleViewSwapHistory = () => {
    console.log('📊 Viewing swap history')
    // Implement swap history view
    toast.info('Swap history view coming soon')
  }

  const processSwapWithNotifications = async (swapData: any) => {
    try {
      console.log('🔔 Processing swap with notifications:', swapData)
      
      // Process the swap
      await createSwapRequest(swapData)
      
      // Close notification dialog
      setShowSwapNotificationDialog(false)
      setPendingSwapData(null)
      
      toast.success('Swap request processed with notifications sent!')
    } catch (error) {
      console.error('Failed to process swap with notifications:', error)
      toast.error('Failed to process swap request')
    }
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
          shifts={shifts}
          zones={zones}
          showSaveDialog={showSaveDialog}
          setShowSaveDialog={setShowSaveDialog}
          showSwapNotificationDialog={showSwapNotificationDialog}
          setShowSwapNotificationDialog={setShowSwapNotificationDialog}
          processSwapWithNotifications={processSwapWithNotifications}
          pendingSwapData={pendingSwapData}
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
          facility={selectedFacility}
          shifts={shifts}
          zones={zones}
        />
      )}

      {/* Swap Request Modal - FIX: Only render when needed */}
      {showSwapModal && selectedAssignmentForSwap && (
        <SwapRequestModal
          open={showSwapModal}
          onClose={() => {
            setShowSwapModal(false)
            setSelectedAssignmentForSwap(null)
          }}
          schedule={currentSchedule}
          currentAssignment={selectedAssignmentForSwap}
          staff={staff}
          shifts={shifts}
          days={DAYS}
          isManager={isManager}
          onSwapRequest={createSwapRequest}
        />
      )}
    </AppLayout>
  )
}