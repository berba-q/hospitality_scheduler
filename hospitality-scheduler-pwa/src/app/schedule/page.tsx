// schedule/page.tsx 
// Main schedule page for both staff and manager views
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/hooks/useTranslations'
import {
  Calendar,
  Clock,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  Zap,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Building,
  List,
  RefreshCw,
  User,
  ArrowLeftRight,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs,TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { FacilitySwapModal } from '@/components/swap/FacilitySwapModal'
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSwapRequests } from '@/hooks/useSwapRequests'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveConfirmationOptions, ScheduleSaveConfirmationDialog } from '@/components/schedule/ScheduleSaveConfirmationDialog'
import { SwapNotificationDialog } from '@/components/swap/SwapNotificationDialog'
import { StaffAvailabilityModal } from '@/components/schedule/StaffAvailabilityModal'
import React from 'react'
import * as ScheduleTypes from '@/types/schedule'
import * as FacilityTypes from '@/types/facility'
import * as SwapTypes from '@/types/swaps'
import * as AuthTypes from '@/types/auth'
import * as ApiTypes from '@/types/api'
import type { SwapSummary } from '@/lib/api'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

type ViewPeriod = 'daily' | 'weekly' | 'monthly'

// Helper type for schedule data from API (flexible for different API responses)
interface ScheduleData {
  assignments: Array<{
    date?: string
    day?: number
    day_of_week?: number
    shift: number
    schedule_id?: string
    assignment_id?: string
    staff_id?: string
    [key: string]: unknown
  }>
  week_start?: string
  [key: string]: unknown
}


interface StaffScheduleViewProps {
  currentDate: Date
  viewPeriod: ViewPeriod
  setCurrentDate: (date: Date) => void
  setViewPeriod: (period: ViewPeriod) => void
  navigatePeriod: (direction: number) => void
  formatPeriodDisplay: (date: Date, period: ViewPeriod) => string
  schedules: ScheduleTypes.Schedule[]
  staff: ScheduleTypes.Staff[]
  currentSchedule: ScheduleTypes.Schedule | null
  swapRequests: SwapTypes.SwapRequest[]
  onSwapRequest: (dayIndex: number, shiftIndex: number, staffId: string) => void
  user: AuthTypes.User | undefined
  facility: FacilityTypes.Facility | null
  shifts: FacilityTypes.FacilityShift[]
  zones: FacilityTypes.FacilityZone[]
}

interface ManagerScheduleViewProps {
  router: AppRouterInstance
  facilities: FacilityTypes.Facility[]
  selectedFacility: FacilityTypes.Facility | null
  setSelectedFacility: (facility: FacilityTypes.Facility | null) => void
  selectedZones: string[]
  setSelectedZones: (zones: string[]) => void
  staff: ScheduleTypes.Staff[]
  schedules: ScheduleTypes.Schedule[]
  currentSchedule: ScheduleTypes.Schedule | null
  setCurrentSchedule: (schedule: ScheduleTypes.Schedule | null) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  viewPeriod: ViewPeriod
  setViewPeriod: (period: ViewPeriod) => void
  currentDate: Date
  setCurrentDate: (date: Date) => void
  showStaffPanel: boolean
  setShowStaffPanel: (show: boolean) => void
  filterRole: string
  setFilterRole: (role: string) => void
  filterZone: string
  setFilterZone: (zone: string) => void
  showSmartGenerateModal: boolean
  setShowSmartGenerateModal: (show: boolean) => void
  showConfigModal: boolean
  setShowConfigModal: (show: boolean) => void
  showScheduleListModal: boolean
  setShowScheduleListModal: (show: boolean) => void
  showStaffAvailabilityModal: boolean
  setShowStaffAvailabilityModal: (show: boolean) => void
  showSwapDashboard: boolean
  setShowSwapDashboard: (show: boolean) => void
  draggedStaff: ScheduleTypes.Staff | null
  setDraggedStaff: (staff: ScheduleTypes.Staff | null) => void
  unsavedChanges: boolean
  setUnsavedChanges: (changed: boolean) => void
  swapRequests: SwapTypes.SwapRequest[]
  swapSummary: SwapSummary | null
  navigatePeriod: (direction: number) => void
  formatPeriodDisplay: (date: Date, period: ViewPeriod) => string
  getPeriodStart: (date: Date, period: ViewPeriod) => Date
  handleAssignmentChange: (dayIndex: number, shiftIndex: number, staffId: string) => Promise<void>
  handleRemoveAssignment: (assignmentId: string) => Promise<void>
  handleSmartGenerate: (config: ScheduleTypes.ScheduleGenerationConfig) => Promise<void>
  handleSaveSchedule: (notificationOptions?: SaveConfirmationOptions) => Promise<void>
  handleDeleteSchedule: (scheduleId: string) => Promise<void>
  handleScheduleSelect: (schedule: ScheduleTypes.Schedule) => void
  handleSwapRequest: (dayIndex: number, shiftIndex: number, staffId: string) => void
  createSwapRequest: (data: Record<string, unknown>) => Promise<unknown>
  approveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  retryAutoAssignment: (swapId: string, avoidStaffIds?: string[]) => Promise<void>
  refreshSwaps: () => Promise<void>
  handleViewSwapHistory: () => void
  shifts: FacilityTypes.FacilityShift[]
  zones: FacilityTypes.FacilityZone[]
  showSaveDialog: boolean
  setShowSaveDialog: (show: boolean) => void
  showSwapNotificationDialog: boolean
  setShowSwapNotificationDialog: (show: boolean) => void
  processSwapWithNotifications: (options: {
    sendWhatsApp: boolean
    sendPushNotifications: boolean
    sendInApp: boolean
    customMessage?: string
    urgencyOverride?: 'low' | 'normal' | 'high' | 'emergency'
  }) => Promise<void>
  pendingSwapData: Record<string, unknown> | null
  apiClient: ReturnType<typeof useApiClient>
}

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
  shifts
  // zones - not used in staff view
}: StaffScheduleViewProps) {
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [myScheduleData, setMyScheduleData] = useState<ScheduleData | null>(null)
  const [mySwapRequests, setMySwapRequests] = useState<SwapTypes.SwapRequest[]>([])
  const [selectedSwapForDetail, setSelectedSwapForDetail] = useState<SwapTypes.SwapRequest | null>(null)
  const [showSwapDetailModal, setShowSwapDetailModal] = useState(false)
  const [showMySwapsModal, setShowMySwapsModal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loading, setLoading] = useState(true)

  //translation hook
  const { t } = useTranslations()

  // Derive the current user's staff‑ID once
  const myStaffId = useMemo(() => {
    if (!user) return undefined

    // PRIORITY 1: Use explicit staff_id from auth if available
    if (user.staff_id) {
      console.log('Using explicit staff_id from auth:', user.staff_id)
      return String(user.staff_id)
    }

    // PRIORITY 2: Match by email (normalized comparison)
    const match = staff.find((s) => 
      s.email && user.email && 
      s.email.toLowerCase().trim() === user.email.toLowerCase().trim()
    )
    if (match) {
      console.log(' Found staff by email match:', match.id, match.email)
      return String(match.id)
    }

    // log error 
    console.error('Could not map user to staff ID:', {
      userEmail: user.email,
      userId: user.id,
      availableStaff: staff.map(s => ({ id: s.id, email: s.email }))
    })
    
    return undefined // Return undefined instead of assuming user.id === staff.id
  }, [user, staff])

  const apiClient = useApiClient()

  useEffect(() => {
    loadMyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewPeriod])

  const loadMyData = async () => {
    try {
      console.log('=== LOADING STAFF DATA ===')
      setLoading(true)

      if (!apiClient) {
        console.log('API client not ready yet')
        setLoading(false)
        return
      }

      if (!myStaffId) {
        return (
          <div className="alert alert-error">
            <h3>{t('staff.staffProfileNotFound')}</h3>
            <p>{t('staff.couldNotLink')}</p>
            <p>{t('common.user')}: {user?.email}</p>
          </div>
        )
      }

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

      // Use getMySchedule method
      try {
        const scheduleData = await apiClient.getMySchedule(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )

        console.log('Staff schedule data received:', scheduleData)

        // Handle the correct response structure from backend
        if (scheduleData && scheduleData.assignments) {
          setMyScheduleData(scheduleData as unknown as ScheduleData)
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
        setMyScheduleData(null)
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
      setMyScheduleData(null)
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _generateShiftColor = (index: number): string => {
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
  const getShiftName = (shiftIndex: number | string): string => {
    console.log('Looking for shift name:', shiftIndex, 'in shifts:', shifts)

    const shiftNum = typeof shiftIndex === 'string' ? parseInt(shiftIndex) : shiftIndex

    // Try multiple matching strategies
    const shift = shifts?.find(s =>
      s.shift_index === shiftNum ||
      String(s.id) === String(shiftIndex) ||
      s.shift_index === shiftNum
    )

    const shiftName = shift?.name || shift?.shift_name || `${t('common.shift')} ${shiftIndex}`
    console.log(' Found shift name:', shiftName, 'for index:', shiftIndex)

    return shiftName
  }

  const getShiftTime = (shiftIndex: number | string): string => {
    const shiftNum = typeof shiftIndex === 'string' ? parseInt(shiftIndex) : shiftIndex

    const shift = shifts?.find(s =>
      s.shift_index === shiftNum ||
      String(s.id) === String(shiftIndex)
    )

    const timeDisplay = shift ? `${shift.start_time} - ${shift.end_time}` : ''
    console.log('Shift time for', shiftIndex, ':', timeDisplay)

    return timeDisplay
  }
    
  // ------------------------------------------------------------
  // Resolve an assignment's ISO‑date string.
  // Falls back to week_start + day index when no explicit `date`.
  // ------------------------------------------------------------
  const getAssignmentISODate = (assignment: {
    date?: string
    day?: number
    day_of_week?: number
    [key: string]: unknown
  }): string => {
    if (assignment?.date) {
      return assignment.date  // already ISO "YYYY‑MM‑DD"
    }

    // Derive from week_start + day index if we can
    const weekStart =
      myScheduleData?.week_start ??
      currentSchedule?.week_start ??
      null

    if (!weekStart || assignment.day === undefined) {
      return ''
    }

    const d = new Date(weekStart)
    d.setDate(d.getDate() + Number(assignment.day))
    return d.toISOString().split('T')[0]
  }

  const getTodayAssignments = () => {
    const assignments = getAssignmentsForDisplay()
    if (assignments.length === 0) return []

    const todayISO = new Date().toISOString().split('T')[0]

    return assignments.filter(
      (a) => getAssignmentISODate(a) === todayISO
    )
  }

  const todayAssignments = getTodayAssignments()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Staff Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {t('schedule.mySchedule')}
              </h1>
              <p className="text-gray-600 mt-1">{t('schedule.viewYourWorkSchedule')}</p>
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
                      {todayAssignments.length} {t('common.shift')}{todayAssignments.length > 1 ? 's' : ''} {t('common.today')}
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
                {t('swaps.mySwaps')}
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
                {t('schedule.viewPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewPeriod} onValueChange={(value) => setViewPeriod(value as ViewPeriod)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">{t('schedule.daily')}</TabsTrigger>
                  <TabsTrigger value="weekly">{t('schedule.weekly')}</TabsTrigger>
                  <TabsTrigger value="monthly">{t('schedule.monthly')}</TabsTrigger>
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
                    {t('common.today')}
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
                {t('schedule.mySchedule')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('common.thisPeriod')}</span>
                  <Badge variant="outline">
                    {getAssignmentCount()} {t('common.shift')} {getAssignmentCount() !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {todayAssignments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-800 mb-1">{t('schedule.todayShifts')}</p>
                    {todayAssignments.map((assignment) => {
                      const shift = shifts.find(
                        (s) =>
                          s.shift_index === Number(assignment.shift) ||
                          String(s.id) === String(assignment.shift)
                      )
                      const shiftTime = shift ? `${shift.start_time} - ${shift.end_time}` : getShiftTime(assignment.shift)
                      const assignmentKey = assignment.id || assignment.assignment_id || `${assignment.shift}-${Math.random()}`
                      return (
                        <div
                          key={String(assignmentKey)}
                          className="text-xs text-green-700"
                        >
                          {shift?.name || shift?.shift_name || getShiftName(assignment.shift)} (
                          {shiftTime})
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onSwapRequest && user && onSwapRequest(0, 0, user.id)}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  {t('schedule.requestSwap')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('common.quickActions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowMySwapsModal(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                {t('schedule.viewAllMySwaps')}
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
              highlightStaffId={myStaffId}
              showMineOnly={showMineOnly}
              onToggleMineOnly={() => setShowMineOnly(!showMineOnly)}
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
              highlightStaffId={myStaffId}
              showMineOnly={showMineOnly}
              onToggleMineOnly={() => setShowMineOnly(!showMineOnly)}
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
              highlightStaffId={myStaffId}
              showMineOnly={showMineOnly}
            />
          )}
        </div>

        {/* No schedule message for staff */}
        {!currentSchedule && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('schedule.noScheduleAvailable')}</h3>
            <p className="text-gray-600">
              {t('schedule.yourManagerHasntCreated')}
            </p>
          </div>
        )}
      </div>

      {/* My Swaps List Modal - Only show when state is true */}
      {showMySwapsModal && (
        <Dialog open={showMySwapsModal} onOpenChange={setShowMySwapsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                {t('schedule.mySwapRequests')} ({mySwapRequests.length})
              </DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[calc(80vh-120px)] space-y-4">
              {mySwapRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('schedule.noSwapRequests')}</h3>
                  <p className="text-gray-600 mb-4">{t('schedule.noSwapRequestsYet')}</p>
                  <Button
                    onClick={() => {
                      setShowMySwapsModal(false)
                      const staffId = user?.staff_id || user?.id
                      if (onSwapRequest && staffId) {
                        onSwapRequest(0, 0, staffId)
                      }
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('schedule.createFirstSwapRequest')}
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
                                swap.status === 'executed' || swap.status === 'manager_approved' || swap.status === 'staff_accepted' || swap.status === 'manager_final_approval' ? 'bg-green-100 text-green-800' :
                                swap.status === 'declined' || swap.status === 'staff_declined' || swap.status === 'assignment_declined' || swap.status === 'cancelled' ? 'bg-red-100 text-red-800' :
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
                              {swap.swap_type === 'specific' ? t('schedule.specificSwapRequest') : t('schedule.autoAssignmentRequest')}
                            </h4>

                            <p className="text-sm text-gray-600 mb-2">
                              {swap.reason || t('common.noReasonProvided')}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {DAYS[swap.original_day]} - {shifts?.find(s => s.shift_index === swap.original_shift)?.name || t('common.unknown') + ' ' + t('common.shift')}
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
                              {t('common.viewDetails')}
                            </Button>

                            {swap.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(t('common.areYouSureCancel') + ' this swap request?')) {
                                    toast.info(t('common.cancel') + ' functionality coming soon')
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                {t('common.cancel')}
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
                      const staffId = user?.staff_id || user?.id
                      if (onSwapRequest && staffId) {
                        onSwapRequest(0, 0, staffId)
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('schedule.createNewSwapRequest')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Swap details modal: Only show when both conditions are true */}
      {showSwapDetailModal && selectedSwapForDetail && (
        <SwapDetailModal
          swap={selectedSwapForDetail}
          open={showSwapDetailModal}
          onClose={() => {
            setShowSwapDetailModal(false)
            setSelectedSwapForDetail(null)
          }}
          onSwapResponse={async (swapId: string, accepted: boolean, notes?: string) => {
            if (!apiClient) {
              toast.error('API client not available')
              return
            }
            try {
              await apiClient.RespondToSwap(swapId, { accepted, notes})
              setShowSwapDetailModal(false)
              setSelectedSwapForDetail(null)
              loadMyData() // Refresh the data
              toast.success(accepted ? t('swaps.swapAccepted') : t('swaps.swapDenied'))
            } catch (error) {
              console.error('SwapResponse error:', error)
              toast.error(t('common.failed') + ' to respond to swap')
            }
          }}
          onCancelSwap={async (swapId: string, reason?: string) => {
            if (!apiClient) {
              toast.error('API client not available')
              return
            }
            try {
              await apiClient.cancelSwapRequest(swapId, reason)
              setShowSwapDetailModal(false)
              setSelectedSwapForDetail(null)
              loadMyData() // Refresh the data
              toast.success(t('swaps.swapRequest') + ' ' + t('common.cancelled'))
            } catch (error) {
              console.error(' CancelSwap error:', error)
              toast.error(t('common.failed') + ' to cancel swap')
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router: _router,
  facilities,
  selectedFacility,
  setSelectedFacility,
  selectedZones,
  setSelectedZones,
  staff,
  schedules,
  currentSchedule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setCurrentSchedule: _setCurrentSchedule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loading: _loading2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLoading: _setLoading2,
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
  showStaffAvailabilityModal,
  setShowStaffAvailabilityModal,
  showSwapDashboard,
  setShowSwapDashboard,
  draggedStaff,
  setDraggedStaff,
  unsavedChanges,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setUnsavedChanges: _setUnsavedChanges,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createSwapRequest: _createSwapRequest,
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
  pendingSwapData,
  apiClient
}: ManagerScheduleViewProps) {
  // Add translation hook for manager view
  const { t } = useTranslations()

  // Filter staff based on facility, zones, and roles
  const facilityStaff = staff.filter(member => 
    member.facility_id === selectedFacility?.id && member.is_active
  )

  const filteredStaff = facilityStaff.filter(member => {
    // Zone filter
    if (filterZone !== 'all' && selectedZones.length > 0) {
      const zone = zones.find(z => z.zone_id === filterZone)
      if (zone && zone.required_roles.length > 0 && !zone.required_roles.includes(member.role)) {
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

  const handleFinalApproval = async (swapId: string, approved: boolean, notes?: string) => {
  if (!apiClient) {
    toast.error('API client not available')
    return
  }
  try {
    console.log('Processing final approval:', { swapId, approved, notes })

    await apiClient.managerFinalApproval(swapId, {
      approved,
      notes,
      override_role_verification: false,
      role_override_reason: undefined
    })

    refreshSwaps() // or your equivalent refresh function
    toast.success(approved ? t('swaps.swapExecutedSuccessfully') : t('swaps.swapDenied'))

  } catch (error) {
    console.error(' Failed to process final approval:', error)
    const errorMessage = error instanceof Error ? error.message : t('common.failed')
    toast.error(errorMessage)
  }
}


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Manager Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {t('schedule.smartScheduleManagement')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('schedule.aiPoweredScheduling')}
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
              {showStaffPanel ? t('common.hide') : t('common.show')} {t('common.staff')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              {t('common.config')}
            </Button>
            
            <Button
              onClick={() => setShowSmartGenerateModal(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Zap className="w-4 h-4" />
              {t('schedule.smartGenerate')}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowScheduleListModal(true)}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              {t('schedule.manageSchedules')}
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
              {t('navigation.swaps')}
              {(swapSummary?.pending_swaps ?? 0) > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5">
                  {swapSummary?.pending_swaps ?? 0}
                </Badge>
              )}
            </Button>

            {/* Staff Availability Modal */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStaffAvailabilityModal(true)}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              {t('schedule.staffAvailability')}
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
                {t('schedule.facilityAndZones')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Facility Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('common.facility')}</label>
                <Select
                  value={selectedFacility?.id || ''}
                  onValueChange={(value) => {
                    const facility = facilities.find(f => f.id === value)
                    setSelectedFacility(facility || null)
                    if (facility?.zones) {
                      setSelectedZones(facility.zones.map(z => z.zone_id || z.id))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('common.selectAFacility')} />
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
                    <span>{zones?.length || 0} {t('common.zones')}</span>
                    <span>•</span>
                    <span>{shifts?.length || 0} {t('common.shifts')}</span>
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
                {t('schedule.viewPeriod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewPeriod} onValueChange={(value) => setViewPeriod(value as ViewPeriod)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">{t('schedule.daily')}</TabsTrigger>
                  <TabsTrigger value="weekly">{t('schedule.weekly')}</TabsTrigger>
                  <TabsTrigger value="monthly">{t('schedule.monthly')}</TabsTrigger>
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
                    {t('common.today')}
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
                {t('common.status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentSchedule ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">{t('schedule.scheduleActive')}</p>
                      {currentSchedule?.is_draft && (
                        <p className="text-xs text-amber-700">{t('common.draft')} – {t('schedule.notPublishedYet')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {currentSchedule.assignments?.length || 0} {t('common.assignments')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">{t('schedule.noSchedule')}</p>
                      <p className="text-xs text-gray-500">{t('schedule.generateSchedule')} or {t('schedule.createSchedule')}</p>
                    </div>
                  </div>
                )}
                
                {selectedZones.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{t('schedule.activeZones')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedZones.map(zoneId => {
                        const zone = availableZones.find(z => (z.zone_id || z.id) === zoneId)
                        return zone ? (
                          <Badge key={zoneId} variant="outline" className="text-xs">
                            {zone.zone_name}
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
                    {unsavedChanges ? t('schedule.publishChanges') : t('common.saved')}
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
            <h3 className="text-xl font-semibold mb-2">{t('common.selectFacility')}</h3>
            <p className="text-gray-600">
              {t('schedule.chooseFacilityFromDropdown')}
            </p>
          </div>
        )}
      </div>

      {/* Manager Modals */}
      {showSmartGenerateModal && selectedFacility && (
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
      
      {showConfigModal && selectedFacility &&  (
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
          onFinalApproval={handleFinalApproval}
        />
      )}

      {/* Staff Availability Modal */}
        {showStaffAvailabilityModal && selectedFacility && (
          <StaffAvailabilityModal
            isOpen={showStaffAvailabilityModal}
            onClose={() => setShowStaffAvailabilityModal(false)}
            facility={selectedFacility}
            currentDate={currentDate}
          />
        )}

      {/* Save Confirmation Dialog */}
      {showSaveDialog && currentSchedule && selectedFacility && (
        <ScheduleSaveConfirmationDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onConfirm={handleSaveSchedule}
          schedule={currentSchedule}
          staffList={facilityStaff}
          facility={selectedFacility}
          isNewSchedule={!currentSchedule.id || currentSchedule.is_generated}
        />
      )}

      {/* Swap Notification Dialog */}
      {showSwapNotificationDialog && pendingSwapData && (
        <SwapNotificationDialog
          open={showSwapNotificationDialog}
          onClose={() => setShowSwapNotificationDialog(false)}
          onConfirm={processSwapWithNotifications}
          swapType="staff_to_staff"
          swapDetails={{
            requesterName: (pendingSwapData.requester_name as string | undefined) || t('common.unknown'),
            targetStaffName: pendingSwapData.target_staff_name as string | undefined,
            originalDay: (pendingSwapData.original_day_name as string) || t('common.unknown'),
            originalShift: (pendingSwapData.original_shift_name as string) || t('common.unknown'),
            reason: (pendingSwapData.reason as string) || '',
            urgency: (pendingSwapData.urgency as 'normal' | 'high' | 'emergency' | 'low') || 'normal'
          }}
          recipientStaff={facilityStaff.filter(s =>
            pendingSwapData.target_staff_id ?
            s.id === pendingSwapData.target_staff_id :
            true
          )}
        />
      )}
    </div>
  )
}

// Helper function to calculate the correct day index for a specific date within a schedule
const getCurrentDayIndex = (
  schedule: ScheduleTypes.Schedule | null,
  currentDate: Date,
  viewPeriod: 'daily' | 'weekly' | 'monthly'
): number => {
  if (!schedule) return 0

  const scheduleStart = new Date(schedule.week_start)

  if (viewPeriod === 'daily') {
    const daysDiff = Math.floor((currentDate.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, Math.min(6, daysDiff))
  }

  return 0
}

// ============================================================================
// MAIN SCHEDULE PAGE COMPONENT
// ============================================================================
export default function SchedulePage() {
  const router = useRouter()
  const { isManager, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const apiClient = useApiClient()
  const { t } = useTranslations() // Add translation hook to main component
  
  // Core state
  const [facilities, setFacilities] = useState<FacilityTypes.Facility[]>([])
  const [selectedFacility, setSelectedFacility] = useState<FacilityTypes.Facility | null>(null)
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [staff, setStaff] = useState<ScheduleTypes.Staff[]>([])
  const [schedules, setSchedules] = useState<ScheduleTypes.Schedule[]>([])
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleTypes.Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleListModal, setShowScheduleListModal] = useState(false)

  // Dynamic facility data
  const [shifts, setShifts] = useState<FacilityTypes.FacilityShift[]>([])
  const [zones, setZones] = useState<FacilityTypes.FacilityZone[]>([])

  // View state
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showStaffPanel, setShowStaffPanel] = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [filterZone, setFilterZone] = useState('all')

  // Modal state
  const [showSmartGenerateModal, setShowSmartGenerateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showStaffAvailabilityModal, setShowStaffAvailabilityModal] = useState(false)

  // Schedule editing state
  const [draggedStaff, setDraggedStaff] = useState<ScheduleTypes.Staff | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Swaps states
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [selectedAssignmentForSwap, setSelectedAssignmentForSwap] = useState<{
    day: number
    shift: number
    staff_id: string
    staffId: string // For compatibility with SwapRequestModal
    schedule_id?: string
  } | null>(null)
  const [showSwapDashboard, setShowSwapDashboard] = useState(false)
  const [facilitiesReady, setFacilitiesReady] = useState(false)

  // Notification states
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSwapNotificationDialog, setShowSwapNotificationDialog] = useState(false)
  const [pendingSwapData, setPendingSwapData] = useState<Record<string, unknown> | null>(null)

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
    createSwapRequest: createSwapRequestHook,
    approveSwap: approveSwapHook,
    retryAutoAssignment: retryAutoAssignmentHook,
    refresh: refreshSwaps
  } = useSwapRequests(managerFacilityId)

  // Wrapper functions to match interface expectations
  const createSwapRequest = async (data: Record<string, unknown>): Promise<unknown> => {
    return await createSwapRequestHook(data as Parameters<typeof createSwapRequestHook>[0])
  }

  // Wrapper for SwapRequestModal which expects void return
  const handleCreateSwapRequest = async (data: Record<string, unknown>): Promise<void> => {
    await createSwapRequestHook(data as Parameters<typeof createSwapRequestHook>[0])
  }

  const approveSwap = async (swapId: string, approved: boolean, notes?: string): Promise<void> => {
    await approveSwapHook(swapId, approved, notes)
  }

  const retryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]): Promise<void> => {
    await retryAutoAssignmentHook(swapId, avoidStaffIds)
  }

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated])

  // Load facility-specific data when facility changes
  useEffect(() => {
    if (selectedFacility) {
      loadFacilityData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility])

  const loadData = async () => {
    if (!apiClient) {
      console.log('API client not ready yet')
      return
    }
    try {
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

          if (!staffProfile.facility_id) {
            throw new Error('Staff profile has no facility assigned')
          }

          const facility = await apiClient.getFacility(staffProfile.facility_id)
          const facilityStaff = await apiClient.getFacilityStaff(staffProfile.facility_id)

          setFacilities([facility])
          setSelectedFacility(facility)
          setStaff(facilityStaff)
        } catch (error) {
          console.error('Failed to load staff profile:', error)
          toast.error(t('common.failedToLoad') + ' your profile')
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error(t('schedule.loadingScheduleData'))
    } finally {
      setLoading(false)
    }
  }

  //  Load facility-specific shifts and zones
  const loadFacilityData = async () => {
    if (!selectedFacility) return
    if (!apiClient) {
      console.log('API client not ready yet')
      return
    }

    try {
      console.log('Loading facility data for:', selectedFacility.name)

      // CRITICAL: Load real shifts from API instead of using SHIFTS constant
      let facilityShifts = []
      try {
        facilityShifts = await apiClient.getFacilityShifts(selectedFacility.id)
        console.log('Real shifts from API:', facilityShifts)
      } catch (error) {
        console.warn('Failed to load shifts from API, using fallback:', error)
        // Fallback to the working SHIFTS constant format
        facilityShifts = [
          { id: '0', name: t('schedule.morning'), start_time: '06:00', end_time: '14:00', color: '#3B82F6' },
          { id: '1', name: t('schedule.afternoon'), start_time: '14:00', end_time: '22:00', color: '#10B981' },
          { id: '2', name: t('schedule.evening'), start_time: '22:00', end_time: '06:00', color: '#F59E0B' }
        ] as Partial<FacilityTypes.FacilityShift>[]
      }

      // Process shifts to match the working format, include shift_index always
      const processedShifts: FacilityTypes.FacilityShift[] = facilityShifts.map((shift, index) => ({
        ...shift, // preserve all original properties
        shift_index: index, // stable column index
        id: shift.id ?? String(index), // ensure id is always a string
        shift_name: shift.shift_name ?? shift.name ?? `${t('common.shift')} ${index + 1}`,
        name: shift.name ?? shift.shift_name ?? `${t('common.shift')} ${index + 1}`,
        start_time: shift.start_time ?? '09:00',
        end_time: shift.end_time ?? '17:00',
        color:
          shift.color ??
          ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5],
        // Provide defaults for required fields if they're missing (for fallback case)
        facility_id: shift.facility_id ?? selectedFacility.id,
        requires_manager: shift.requires_manager ?? false,
        min_staff: shift.min_staff ?? 1,
        max_staff: shift.max_staff ?? 10,
        shift_order: shift.shift_order ?? index,
        is_active: shift.is_active ?? true,
        created_at: shift.created_at ?? new Date().toISOString(),
        updated_at: shift.updated_at,
      })) as FacilityTypes.FacilityShift[]

      console.log('Processed shifts:', processedShifts)
      setShifts(processedShifts)

      // Load zones (keep your existing zone logic)
      const facilityZones = selectedFacility.zones || []
      setZones(facilityZones)

      if (facilityZones.length > 0) {
        setSelectedZones(facilityZones.map(z => z.zone_id || z.id))
      }

    } catch (error) {
      console.error('Failed to load facility data:', error)
      toast.error(t('common.failedToLoad') + ' facility configuration')
    }
  }


  // normalize assignment data
  const normalizeAssignments = (assignments: unknown[]): ScheduleTypes.ScheduleAssignment[] => {
    if (!assignments) {
      return []
    }

    const normalized = assignments.map((assignment, index) => {
      const a = assignment as Record<string, unknown>
      const normalized: ScheduleTypes.ScheduleAssignment = {
        id: (a.id as string) || `assignment-${a.schedule_id || 'temp'}-${a.day}-${a.shift}-${a.staff_id}-${index}`,
        day: Number(a.day),
        shift: Number(a.shift),
        staff_id: String(a.staff_id),
        schedule_id: a.schedule_id as string | undefined,
        zone_id: a.zone_id as string | undefined
      }

      return normalized
    })

    return normalized
  }

  //  Load schedules when facility or date changes
  useEffect(() => {
    if (selectedFacility) {
      loadSchedules()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility, currentDate, viewPeriod])

  // loadSchedules properly
  const loadSchedules = async () => {
  if (!selectedFacility) {
    console.log('No facility selected, skipping schedule load')
    return
  }
  if (!apiClient) {
    console.log('API client not ready yet')
    return
  }

  try {
    console.log('Loading schedules for facility:', selectedFacility.name)

    const schedulesData = await apiClient.getFacilitySchedules(selectedFacility.id)
    
    console.log('Raw API response:', {
      schedulesCount: schedulesData.length,
      schedules: schedulesData.map(s => ({
        id: s.id,
        week_start: s.week_start,
        assignments_count: s.assignments?.length || 0
      }))
    })
    
    // CRITICAL: Normalize schedule data
    const normalizedSchedules = schedulesData.map(schedule => {
      const normalized = {
        ...schedule,
        week_start: schedule.week_start.split('T')[0],
        assignments: normalizeAssignments(schedule.assignments || []) // THIS WAS KEY
      }
      
      console.log(` Normalized schedule ${schedule.id}:`, {
        original_week_start: schedule.week_start,
        normalized_week_start: normalized.week_start,
        assignments_count: normalized.assignments.length
      })
      
      return normalized
    })
    
    console.log('Schedules normalized:', normalizedSchedules.length)
    setSchedules(normalizedSchedules)
    
    // Find schedule for current period
    const currentPeriodSchedule = findScheduleForCurrentPeriod(normalizedSchedules, currentDate, viewPeriod)
    
    console.log('Current schedule found:', currentPeriodSchedule?.id || 'none')
    setCurrentSchedule(currentPeriodSchedule || null)
    
  } catch (error) {
    console.error('Failed to load schedules:', error)
    setSchedules([])
    setCurrentSchedule(null)
  }
}
// Helper function to find schedules
  const findScheduleForCurrentPeriod = (
    schedules: ScheduleTypes.Schedule[],
    currentDate: Date,
    viewPeriod: ViewPeriod
  ): ScheduleTypes.Schedule | null | undefined => {
    console.log('Finding schedule for:', {
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

  // Helper: check if a string is a UUID (v4-style)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isUuid = (val?: string) =>
    !!val && /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(val)

  // Helper function to get the end date of a week (6 days after start)
  const getWeekEndDate = (weekStartString: string): Date => {
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

  // Helper function to create draft schedules
  const createDraftSchedule = (): ScheduleTypes.Schedule => {
  const weekStartISO = getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0]
  const draft = {
    id: `draft-${selectedFacility?.id || 'facility'}-${weekStartISO}`,
    facility_id: selectedFacility?.id,
    week_start: weekStartISO,
    assignments: [],
    is_generated: false,
    is_draft: true,
  }
  setCurrentSchedule(draft)
    return draft
  }

  const ensureDraftSchedule = (): ScheduleTypes.Schedule => {
    return currentSchedule ?? createDraftSchedule()
  }

  // Handler functions
  const handleAssignmentChange = async (dayIndex: number, shiftIndex: number, staffId: string) => {
    const schedule = ensureDraftSchedule()
    if (!schedule) return

    try {
        console.log(' SHIFT DEBUG - Received parameters:', { 
        dayIndex, 
        shiftIndex, 
        staffId,
        dayType: typeof dayIndex,
        shiftType: typeof shiftIndex,
        dayIsNumber: !isNaN(Number(dayIndex)),
        shiftIsNumber: !isNaN(Number(shiftIndex))
      })

      const normalizedDay = Number(dayIndex)
      const normalizedShift = Number(shiftIndex)
      
      if (isNaN(normalizedDay) || isNaN(normalizedShift)) {
        console.error(' Invalid day or shift values:', { dayIndex, shiftIndex })
        toast.error('Invalid assignment data')
        return
      }

      console.log(' Assignment change:', { 
        normalizedDay, 
        normalizedShift, 
        staffId 
      })

      // Generate a temporary ID for the assignment
      const tempId = `temp-${Date.now()}-${normalizedDay}-${normalizedShift}-${staffId}`

      
      // Create new assignment
      const newAssignment = {
        id: tempId,
        day: normalizedDay,
        shift: normalizedShift,  
        staff_id: String(staffId),
        schedule_id: schedule.id,
        created_at: new Date().toISOString()
      }
      console.log('Creating assignment object:', newAssignment)

      // Prevent duplicates (same day/shift/staff)
    const exists = (schedule.assignments || []).some(
      (a: ScheduleTypes.ScheduleAssignment) => {
        const existingDay = Number(a.day)
        const existingShift = Number(a.shift)
        const existingStaff = String(a.staff_id)
        
        console.log(' Checking duplicate against:', { existingDay, existingShift, existingStaff })
        
        return existingDay === normalizedDay &&
               existingShift === normalizedShift &&
               existingStaff === String(staffId)
      }
    )
    if (exists) {
      toast.error(t('schedule.assignmentExists'))
      return
    }


      // Update local state immediately for responsiveness
      // Immutable update so the calendar re-renders
    const updated = {
      ...schedule,
      assignments: [...(schedule.assignments || []), newAssignment],
      updated_at: new Date().toISOString()
    }

    setCurrentSchedule(updated)
    setUnsavedChanges(true)

    console.log(' Local schedule updated. Assignments:', updated.assignments.length)
    console.log(' All assignments now:', updated.assignments.map(a => ({ 
      day: a.day, 
      shift: a.shift, 
      staff_id: a.staff_id 
    })))
      
      toast.success(t('common.assignments') + ' ' + t('common.add'))
    } catch (error) {
      console.error('Failed to add assignment:', error)
      toast.error(t('common.failedToCreate') + ' assignment')
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const schedule = ensureDraftSchedule()
      console.log('Removing assignment:', assignmentId, 'from schedule', schedule.id)

      const updatedSchedule = {
        ...schedule,
        assignments: (schedule.assignments || []).filter((a: ScheduleTypes.ScheduleAssignment) => a.id !== assignmentId),
      }

      setCurrentSchedule(updatedSchedule)
      setUnsavedChanges(true)

      toast.success(t('common.assignments') + ' ' + t('common.delete'))
    } catch (error) {
      console.error('Failed to remove assignment:', error)
      toast.error(t('common.failedToDelete') + ' assignment')
    }
  }

  const handleSmartGenerate = async (config: ScheduleTypes.ScheduleGenerationConfig) => {
    try {
      setLoading(true)
      console.log('Smart generating schedule with config:', config)

      if (!apiClient) {
        throw new Error('API client not initialized')
      }

      const generatedSchedule = await apiClient.generateSmartSchedule({
        facility_id: selectedFacility!.id,
        period_start: getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0],
        period_type: viewPeriod,
        zones: selectedZones,
        zone_assignments: (config.zone_assignments || {}) as Record<string, unknown>,
        role_mapping: config.role_mapping || {},
        ...config
      } as Parameters<typeof apiClient.generateSmartSchedule>[0])

      console.log(' Schedule generated:', generatedSchedule)
      setCurrentSchedule(generatedSchedule)
      setUnsavedChanges(true)
      setShowSmartGenerateModal(false)
      
      toast.success(t('schedule.smartGenerate') + ' ' + t('common.createdSuccessfully'))
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      toast.error(t('common.failedToCreate') + ' schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSchedule = async (notificationOptions?: SaveConfirmationOptions) => {
  if (!currentSchedule) return
  if (!apiClient) {
    toast.error('API client not available')
    return
  }
  if (!selectedFacility) {
    toast.error('No facility selected')
    return
  }

  try {
    console.log(' Saving schedule:', currentSchedule.id)

    console.log('SAVE DEBUG - Original assignments:', 
      currentSchedule.assignments?.map(a => ({ 
        id: a.id,
        day: a.day, 
        shift: a.shift, 
        staff_id: a.staff_id,
        dayType: typeof a.day,
        shiftType: typeof a.shift
      }))
    )
    
    let scheduleId: string
    
    // Step 1: Create or update schedule
    const isDraftSchedule = currentSchedule.is_draft || 
                            currentSchedule.id.startsWith('draft-') || 
                            currentSchedule.is_generated
    
    if (isDraftSchedule) {
      // CREATE PATH - New schedule or draft schedule
      console.log(' Creating new schedule (draft or generated)')
      
      // CRITICAL: Clean the assignment data - remove draft IDs
      const cleanAssignments: ApiTypes.CreateScheduleAssignment[] = (currentSchedule.assignments || []).map((assignment, index) => {
        const cleanedAssignment: ApiTypes.CreateScheduleAssignment = {
          day: Number(assignment.day),
          shift: Number(assignment.shift),
          staff_id: String(assignment.staff_id),
          zone_id: assignment.zone_id || undefined
        }

        //Validate assignment elements
        if (isNaN(cleanedAssignment.day) || isNaN(cleanedAssignment.shift)) {
          console.error(` Invalid assignment ${index}:`, { 
            original: assignment, 
            cleaned: cleanedAssignment 
          })
          throw new Error(`Assignment ${index} has invalid day/shift values`)
        }
        
        return cleanedAssignment
      })

      console.log(' SAVE DEBUG - Cleaned assignments:', cleanAssignments)
      
      const createData = {
        facility_id: selectedFacility.id,
        week_start: getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0],
        assignments: cleanAssignments
      }
      console.log('SAVE DEBUG - Sending to API:', createData)
      
      console.log('Creating schedule with cleaned data:', {
        ...createData,
        assignments_sample: cleanAssignments.slice(0, 3)
      })
      
      const savedSchedule = await apiClient.createSchedule(createData)
      console.log('Schedule created successfully:', savedSchedule.id)
      
      setCurrentSchedule(savedSchedule)
      scheduleId = savedSchedule.id
      
    } else {
      // UPDATE PATH - Existing real schedule
      console.log('Updating existing schedule')

      const cleanAssignments: ApiTypes.CreateScheduleAssignment[] = (currentSchedule.assignments || []).map((assignment, index) => {
        const cleanedAssignment: ApiTypes.CreateScheduleAssignment = {
          day: Number(assignment.day),
          shift: Number(assignment.shift),
          staff_id: String(assignment.staff_id),
          zone_id: assignment.zone_id || undefined
        }
        
        if (isNaN(cleanedAssignment.day) || isNaN(cleanedAssignment.shift)) {
          console.error(`Invalid assignment ${index}:`, { 
            original: assignment, 
            cleaned: cleanedAssignment 
          })
          throw new Error(`Assignment ${index} has invalid day/shift values`)
        }
        
        return cleanedAssignment
      })
      
      // For updates, also clean assignment data
      const updateData = {
        ...currentSchedule,
        assignments: cleanAssignments
      }
      
      await apiClient.updateSchedule(currentSchedule.id, updateData)
      scheduleId = currentSchedule.id
    }
    
    // Step 2: If notification options provided, publish the schedule
    if (notificationOptions) {
      console.log('📢 Publishing schedule with notifications:', notificationOptions)
      await apiClient.publishSchedule(scheduleId, {
        send_whatsapp: notificationOptions.sendWhatsApp,
        send_push: notificationOptions.sendPushNotifications,
        send_email: notificationOptions.sendEmail,
        generate_pdf: notificationOptions.generatePdf,
        custom_message: notificationOptions.customMessage
      })
      
      toast.success(t('schedule.schedulePublished'))
    } else {
      toast.success(t('schedule.schedule') + ' ' + t('common.savedSuccessfully'))
    }
    
    setUnsavedChanges(false)
    setShowSaveDialog(false)
    
    // Reload schedules to get fresh data
    await loadSchedules()
    
  } catch (error) {
    console.error('Failed to save schedule:', error)
    const err = error as { message?: string; response?: { data?: unknown; status?: number } }
    console.error('Error details:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    })
    toast.error(t('common.failedToSave') + ' schedule: ' + (err.message || 'Unknown error'))
  }
}

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!apiClient) {
      toast.error('API client not available')
      return
    }
    try {
      console.log('Deleting schedule:', scheduleId)

      await apiClient.deleteSchedule(scheduleId)
      
      // Remove from local state
      setSchedules(schedules.filter(s => s.id !== scheduleId))
      
      // Clear current schedule if it was deleted
      if (currentSchedule?.id === scheduleId) {
        setCurrentSchedule(null)
        setUnsavedChanges(false)
      }
      
      toast.success(t('schedule.schedule') + ' ' + t('common.deletedSuccessfully'))
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      toast.error(t('common.failedToDelete') + ' schedule')
    }
  }

  const handleScheduleSelect = (schedule: ScheduleTypes.Schedule) => {
    console.log('Selecting schedule:', schedule.id)
    setCurrentSchedule(schedule)
    setUnsavedChanges(false)
    setShowScheduleListModal(false)

    // Update current date to match schedule
    if (schedule.week_start) {
      setCurrentDate(new Date(schedule.week_start))
    }
  }

  const handleSwapRequest = (dayIndex: number, shiftIndex: number, staffId: string) => {
    console.log('Swap request:', { dayIndex, shiftIndex, staffId })

    // Set up swap request data
    setSelectedAssignmentForSwap({
      day: dayIndex,
      shift: shiftIndex,
      staff_id: staffId,
      staffId: staffId, // Include both for compatibility
      schedule_id: currentSchedule?.id
    })

    setShowSwapModal(true)
  }

  const handleViewSwapHistory = () => {
    console.log('Viewing swap history')
    // Implement swap history view
    toast.info(t('swaps.swapHistory') + ' view coming soon')
  }

  const processSwapWithNotifications = async (options: {
    sendWhatsApp: boolean
    sendPushNotifications: boolean
    sendInApp: boolean
    customMessage?: string
    urgencyOverride?: 'low' | 'normal' | 'high' | 'emergency'
  }) => {
    try {
      console.log('Processing swap with notifications:', options)

      // Process the swap with the stored pending data
      if (pendingSwapData) {
        await createSwapRequest(pendingSwapData as Parameters<typeof createSwapRequest>[0])
      }

      // Close notification dialog
      setShowSwapNotificationDialog(false)
      setPendingSwapData(null)

      toast.success(t('swaps.swapRequest') + ' processed with notifications sent!')
    } catch (error) {
      console.error('Failed to process swap with notifications:', error)
      toast.error(t('common.failedToCreate') + ' swap request')
    }
  }

  if (authLoading || loading || !apiClient) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('schedule.loadingScheduleData')}</p>
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
          showStaffAvailabilityModal={showStaffAvailabilityModal}
          setShowStaffAvailabilityModal={setShowStaffAvailabilityModal}
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
          apiClient={apiClient}
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

      {/* Swap Request Modal */}
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
          onSwapRequest={handleCreateSwapRequest}
        />
      )}
    </AppLayout>
  )
}